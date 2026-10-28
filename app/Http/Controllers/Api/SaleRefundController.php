<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashierShift;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleRefund;
use App\Models\SaleReturn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleRefundController extends Controller
{
    /**
     * GET /api/sale-refunds
     * List sale refunds with return, payment method, and processedBy relations
     */
    public function index(Request $request): JsonResponse
    {
        $query = SaleRefund::with([
            'saleReturn:id,return_number,sale_id,refund_total,status',
            'paymentMethod:id,code,name,method_type',
            'processedBy:id,name,email',
        ])->latest();

        if ($request->filled('sale_return_id')) {
            $query->where('sale_return_id', $request->query('sale_return_id'));
        }

        if ($request->filled('payment_method_id')) {
            $query->where('payment_method_id', $request->query('payment_method_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/sale-refunds/{saleRefund}
     * Get single refund record details
     */
    public function show(SaleRefund $saleRefund): JsonResponse
    {
        return response()->json($saleRefund->load([
            'saleReturn.sale',
            'paymentMethod',
            'processedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/sale-refunds
     * Issue customer refund payout against an approved/received sale return
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sale_return_id'        => ['required', 'exists:sale_returns,id'],
            'payment_method_id'     => ['required', 'exists:payment_methods,id'],
            'amount'                => ['required', 'numeric', 'min:0.01'],
            'status'                => ['nullable', 'in:pending,succeeded,failed,cancelled'],
            'transaction_reference' => ['nullable', 'string', 'max:150'],
            'notes'                 => ['nullable', 'string'],
        ]);

        $refund = DB::transaction(function () use ($request, $validated) {
            $saleReturn = SaleReturn::with('sale')->findOrFail($validated['sale_return_id']);

            if (in_array($saleReturn->status, [SaleReturn::STATUS_REJECTED, SaleReturn::STATUS_CANCELLED])) {
                throw ValidationException::withMessages([
                    'sale_return_id' => ["Cannot disburse refund for a sale return in '{$saleReturn->status}' status."],
                ]);
            }

            // Verify refund amount against return ceiling
            $alreadyRefunded = (float) SaleRefund::where('sale_return_id', $saleReturn->id)
                ->whereIn('status', [SaleRefund::STATUS_PENDING, SaleRefund::STATUS_SUCCEEDED])
                ->sum('amount');

            $maxAllowed = max(0, (float) $saleReturn->refund_total - $alreadyRefunded);
            $amount = (float) $validated['amount'];

            if ($amount > $maxAllowed) {
                throw ValidationException::withMessages([
                    'amount' => ["Refund amount ({$amount}) exceeds the remaining returnable total ({$maxAllowed})."],
                ]);
            }

            $refundNumber = 'REF-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));
            $status = $validated['status'] ?? SaleRefund::STATUS_SUCCEEDED;

            $createdRefund = SaleRefund::create([
                'refund_number'         => $refundNumber,
                'sale_return_id'        => $saleReturn->id,
                'payment_method_id'     => $validated['payment_method_id'],
                'amount'                => $amount,
                'status'                => $status,
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'refunded_at'           => ($status === SaleRefund::STATUS_SUCCEEDED) ? now() : null,
                'processed_by'          => $request->user()->id,
                'notes'                 => $validated['notes'] ?? null,
            ]);

            if ($status === SaleRefund::STATUS_SUCCEEDED) {
                $this->processSucceededRefund($createdRefund, $saleReturn, $request->user()->id);
            }

            return $createdRefund;
        });

        return response()->json([
            'message' => 'Customer refund payout recorded successfully.',
            'refund'  => $refund->load(['saleReturn', 'paymentMethod']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/sale-refunds/{saleRefund}
     * Update refund status or transaction details
     */
    public function update(Request $request, SaleRefund $saleRefund): JsonResponse
    {
        $validated = $request->validate([
            'status'                => ['sometimes', 'in:pending,succeeded,failed,cancelled'],
            'transaction_reference' => ['nullable', 'string', 'max:150'],
            'notes'                 => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($request, $validated, $saleRefund) {
            $oldStatus = $saleRefund->status;
            $newStatus = $validated['status'] ?? $oldStatus;

            $saleRefund->fill($validated);

            if ($oldStatus !== SaleRefund::STATUS_SUCCEEDED && $newStatus === SaleRefund::STATUS_SUCCEEDED) {
                $saleRefund->refunded_at = now();
                $saleReturn = $saleRefund->saleReturn;
                if ($saleReturn) {
                    $this->processSucceededRefund($saleRefund, $saleReturn, $request->user()->id);
                }
            }

            $saleRefund->save();
        });

        return response()->json([
            'message' => 'Sale refund updated successfully.',
            'refund'  => $saleRefund->fresh(['saleReturn', 'paymentMethod']),
        ]);
    }

    /**
     * DELETE /api/sale-refunds/{saleRefund}
     * Delete pending or failed refund record (Guarded against succeeded refunds)
     */
    public function destroy(SaleRefund $saleRefund): JsonResponse
    {
        if ($saleRefund->status === SaleRefund::STATUS_SUCCEEDED) {
            return response()->json([
                'message' => 'Cannot delete a succeeded refund transaction. Tender reversal or cancellation required.',
            ], 409);
        }

        $saleRefund->delete();

        return response()->json([
            'message' => 'Sale refund deleted successfully.',
        ]);
    }

    /**
     * Helper to process side effects of a succeeded refund (cash movements and return/sale statuses)
     */
    protected function processSucceededRefund(SaleRefund $refund, SaleReturn $saleReturn, int $userId): void
    {
        $paymentMethod = PaymentMethod::find($refund->payment_method_id);
        if ($paymentMethod && ($paymentMethod->method_type === PaymentMethod::TYPE_CASH || strtolower($paymentMethod->code) === 'cash')) {
            $activeShift = CashierShift::where('user_id', $userId)
                ->where('status', CashierShift::STATUS_OPEN)
                ->latest()
                ->first();

            if ($activeShift) {
                CashMovement::create([
                    'cashier_shift_id' => $activeShift->id,
                    'movement_type'    => CashMovement::TYPE_CASH_OUT,
                    'amount'           => $refund->amount,
                    'reason'           => "Customer refund disbursement for Return {$saleReturn->return_number} (#{$refund->refund_number})",
                ]);
                $activeShift->decrement('expected_cash', $refund->amount);
            }
        }

        // Check if all return total is refunded
        $totalSucceeded = (float) SaleRefund::where('sale_return_id', $saleReturn->id)
            ->where('status', SaleRefund::STATUS_SUCCEEDED)
            ->sum('amount');

        if ($totalSucceeded >= (float) $saleReturn->refund_total && (float) $saleReturn->refund_total > 0) {
            $saleReturn->update(['status' => SaleReturn::STATUS_REFUNDED]);
        }

        // Sync parent sale payment status
        $sale = $saleReturn->sale;
        if ($sale) {
            $totalRefundsForSale = (float) SaleRefund::whereHas('saleReturn', function ($q) use ($sale) {
                $q->where('sale_id', $sale->id);
            })->where('status', SaleRefund::STATUS_SUCCEEDED)->sum('amount');

            if ($totalRefundsForSale >= (float) $sale->grand_total && (float) $sale->grand_total > 0) {
                $sale->update(['payment_status' => Sale::PAYMENT_REFUNDED]);
            } elseif ($totalRefundsForSale > 0) {
                $sale->update(['payment_status' => Sale::PAYMENT_PARTIALLY_REFUNDED]);
            }
        }
    }
}
