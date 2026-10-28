<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierPaymentController extends Controller
{
    /**
     * GET /api/supplier-payments
     * List supplier payments with filtering by supplier, PO, or status
     */
    public function index(Request $request): JsonResponse
    {
        $query = SupplierPayment::with([
            'supplier:id,supplier_code,name',
            'purchaseOrder:id,purchase_order_number,grand_total,status',
            'paymentMethod:id,code,name',
            'recordedBy:id,name',
        ])->latest();

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        if ($request->filled('purchase_order_id')) {
            $query->where('purchase_order_id', $request->query('purchase_order_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/supplier-payments/{supplierPayment}
     * Get single supplier payment details
     */
    public function show(SupplierPayment $supplierPayment): JsonResponse
    {
        return response()->json($supplierPayment->load([
            'supplier',
            'purchaseOrder.items',
            'paymentMethod',
            'recordedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/supplier-payments
     * Record a payment made to a supplier
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'           => ['required', 'exists:suppliers,id'],
            'purchase_order_id'     => ['nullable', 'exists:purchase_orders,id'],
            'payment_method_id'     => ['required', 'exists:payment_methods,id'],
            'amount'                => ['required', 'numeric', 'min:0.01'],
            'currency_code'         => ['nullable', 'string', 'max:3'],
            'status'                => ['nullable', 'string', Rule::in(SupplierPayment::$statuses)],
            'transaction_reference' => ['nullable', 'string', 'max:150'],
            'paid_at'               => ['nullable', 'date'],
            'notes'                 => ['nullable', 'string'],
        ]);

        $payment = SupplierPayment::create([
            'payment_number'        => 'SPAY-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
            'supplier_id'           => $validated['supplier_id'],
            'purchase_order_id'     => $validated['purchase_order_id'] ?? null,
            'payment_method_id'     => $validated['payment_method_id'],
            'amount'                => $validated['amount'],
            'currency_code'         => $validated['currency_code'] ?? 'ETB',
            'status'                => $validated['status'] ?? SupplierPayment::STATUS_SUCCEEDED,
            'transaction_reference' => $validated['transaction_reference'] ?? null,
            'paid_at'               => $validated['paid_at'] ?? now(),
            'recorded_by'           => $request->user()->id,
            'notes'                 => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message'          => 'Supplier payment recorded successfully.',
            'supplier_payment' => $payment->load(['supplier', 'purchaseOrder', 'paymentMethod']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/supplier-payments/{supplierPayment}
     * Update payment status or reference
     */
    public function update(Request $request, SupplierPayment $supplierPayment): JsonResponse
    {
        $validated = $request->validate([
            'status'                => ['sometimes', 'required', 'string', Rule::in(SupplierPayment::$statuses)],
            'transaction_reference' => ['sometimes', 'nullable', 'string', 'max:150'],
            'notes'                 => ['sometimes', 'nullable', 'string'],
        ]);

        $supplierPayment->update($validated);

        return response()->json([
            'message'          => 'Supplier payment updated successfully.',
            'supplier_payment' => $supplierPayment->refresh()->load(['supplier', 'paymentMethod']),
        ]);
    }
}
