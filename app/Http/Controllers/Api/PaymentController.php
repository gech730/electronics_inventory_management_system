<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashierShift;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    /**
     * Display a listing of payments with filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payment::query()
            ->with([
                'customer:id,customer_code,display_name,phone',
                'paymentMethod:id,code,name,method_type',
                'recordedBy:id,name,email',
            ]);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('payment_method_id')) {
            $query->where('payment_method_id', $request->payment_method_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payment_number', 'like', "%{$search}%")
                  ->orWhere('transaction_reference', 'like', "%{$search}%")
                  ->orWhere('provider_transaction_id', 'like', "%{$search}%");
            });
        }

        $payments = $query->latest('received_at')->paginate($request->integer('per_page', 15));

        return response()->json($payments);
    }

    /**
     * Display the specified payment with allocations and tender details.
     */
    public function show(Payment $payment): JsonResponse
    {
        $payment->load([
            'customer',
            'paymentMethod',
            'recordedBy:id,name,email',
            'allocations.sale:id,sale_number,total_amount,created_at',
        ]);

        return response()->json($payment);
    }

    /**
     * Ingest a payment transaction with optional sale/invoice allocations.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id'             => ['nullable', 'exists:customers,id'],
            'payment_method_id'       => ['required', 'exists:payment_methods,id'],
            'amount'                  => ['required', 'numeric', 'min:0.01'],
            'currency_code'           => ['nullable', 'string', 'size:3'],
            'status'                  => ['nullable', 'string', 'in:pending,succeeded,failed,cancelled,reversed'],
            'transaction_reference'   => ['nullable', 'string', 'max:150'],
            'provider_transaction_id' => ['nullable', 'string', 'max:150'],
            'idempotency_key'         => ['nullable', 'string', 'max:100', 'unique:payments,idempotency_key'],
            'notes'                   => ['nullable', 'string'],

            'allocations'                   => ['nullable', 'array'],
            'allocations.*.sale_id'         => ['required', 'exists:sales,id'],
            'allocations.*.allocated_amount'=> ['required', 'numeric', 'min:0.01'],
        ]);

        $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

        if ($paymentMethod->requires_reference && empty($validated['transaction_reference'])) {
            throw ValidationException::withMessages([
                'transaction_reference' => ["Payment method '{$paymentMethod->name}' requires a transaction reference."],
            ]);
        }

        $payment = DB::transaction(function () use ($request, $validated, $paymentMethod) {
            $paymentNumber = 'PAY-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            $status = $validated['status'] ?? Payment::STATUS_SUCCEEDED;
            $amount = (float) $validated['amount'];

            $payment = Payment::create([
                'payment_number'          => $paymentNumber,
                'customer_id'             => $validated['customer_id'] ?? null,
                'payment_method_id'       => $paymentMethod->id,
                'amount'                  => $amount,
                'currency_code'           => $validated['currency_code'] ?? 'ETB',
                'status'                  => $status,
                'transaction_reference'   => $validated['transaction_reference'] ?? null,
                'provider_transaction_id' => $validated['provider_transaction_id'] ?? null,
                'idempotency_key'         => $validated['idempotency_key'] ?? null,
                'received_at'             => now(),
                'recorded_by'             => $request->user()?->id,
                'notes'                   => $validated['notes'] ?? null,
            ]);

            // Create allocations if provided
            if (!empty($validated['allocations'])) {
                foreach ($validated['allocations'] as $allocationData) {
                    PaymentAllocation::create([
                        'payment_id'       => $payment->id,
                        'sale_id'          => $allocationData['sale_id'],
                        'allocated_amount' => $allocationData['allocated_amount'],
                        'allocated_at'     => now(),
                        'allocated_by'     => $request->user()?->id,
                    ]);
                }
            }

            // If cash payment and recorded by cashier with an active open shift, automatically record cash_in
            if ($paymentMethod->method_type === PaymentMethod::TYPE_CASH && $status === Payment::STATUS_SUCCEEDED && $request->user()) {
                $openShift = CashierShift::where('opened_by', $request->user()->id)
                    ->where('status', CashierShift::STATUS_OPEN)
                    ->first();

                if ($openShift) {
                    CashMovement::create([
                        'cashier_shift_id' => $openShift->id,
                        'movement_type'    => CashMovement::TYPE_CASH_IN,
                        'amount'           => $amount,
                        'reason'           => "Customer payment received: {$payment->payment_number}",
                        'payment_id'       => $payment->id,
                        'recorded_by'      => $request->user()->id,
                        'occurred_at'      => now(),
                    ]);
                    $openShift->increment('expected_cash', $amount);
                }
            }

            return $payment;
        });

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->load(['customer', 'paymentMethod', 'allocations.sale']),
        ], 201);
    }

    /**
     * Update payment status or reference notes.
     */
    public function update(Request $request, Payment $payment): JsonResponse
    {
        $validated = $request->validate([
            'status'                => ['sometimes', 'string', 'in:pending,succeeded,failed,cancelled,reversed'],
            'transaction_reference' => ['sometimes', 'nullable', 'string', 'max:150'],
            'notes'                 => ['sometimes', 'nullable', 'string'],
        ]);

        $payment->update($validated);

        return response()->json([
            'message' => 'Payment updated successfully.',
            'payment' => $payment->fresh(['customer', 'paymentMethod']),
        ]);
    }

    /**
     * Purge an unfinalized payment record with status guards.
     */
    public function destroy(Payment $payment): JsonResponse
    {
        if (in_array($payment->status, [Payment::STATUS_SUCCEEDED, Payment::STATUS_REVERSED])) {
            return response()->json([
                'message' => "Cannot delete a {$payment->status} payment record. Historical financial ledger entries are immutable.",
            ], 409);
        }

        DB::transaction(function () use ($payment) {
            $payment->allocations()->delete();
            $payment->delete();
        });

        return response()->json([
            'message' => 'Payment record deleted successfully.',
        ]);
    }
}
