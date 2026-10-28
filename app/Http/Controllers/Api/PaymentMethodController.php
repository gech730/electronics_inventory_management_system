<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\SaleRefund;
use App\Models\SupplierPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of payment methods.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PaymentMethod::query();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('method_type')) {
            $query->where('method_type', $request->method_type);
        }

        $methods = $query->orderBy('sort_order')->orderBy('name')->get();

        return response()->json($methods);
    }

    /**
     * Display the specified payment method.
     */
    public function show(PaymentMethod $paymentMethod): JsonResponse
    {
        return response()->json($paymentMethod);
    }

    /**
     * Store a newly created payment method in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'               => ['required', 'string', 'max:50', 'unique:payment_methods,code'],
            'name'               => ['required', 'string', 'max:100'],
            'method_type'        => ['required', 'string', 'in:cash,bank_transfer,mobile_money,card,cheque,other'],
            'provider_name'      => ['nullable', 'string', 'max:100'],
            'requires_reference' => ['nullable', 'boolean'],
            'is_active'          => ['nullable', 'boolean'],
            'sort_order'         => ['nullable', 'integer'],
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['requires_reference'] = $validated['requires_reference'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $method = PaymentMethod::create($validated);

        return response()->json([
            'message'        => 'Payment method created successfully.',
            'payment_method' => $method,
        ], 201);
    }

    /**
     * Update the specified payment method in storage.
     */
    public function update(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $validated = $request->validate([
            'code'               => ['sometimes', 'string', 'max:50', 'unique:payment_methods,code,' . $paymentMethod->id],
            'name'               => ['sometimes', 'string', 'max:100'],
            'method_type'        => ['sometimes', 'string', 'in:cash,bank_transfer,mobile_money,card,cheque,other'],
            'provider_name'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'requires_reference' => ['sometimes', 'boolean'],
            'is_active'          => ['sometimes', 'boolean'],
            'sort_order'         => ['sometimes', 'integer'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $paymentMethod->update($validated);

        return response()->json([
            'message'        => 'Payment method updated successfully.',
            'payment_method' => $paymentMethod->fresh(),
        ]);
    }

    /**
     * Remove the specified payment method from storage with usage guards.
     */
    public function destroy(PaymentMethod $paymentMethod): JsonResponse
    {
        $hasPayments = Payment::where('payment_method_id', $paymentMethod->id)->exists();
        $hasRefunds = SaleRefund::where('payment_method_id', $paymentMethod->id)->exists();
        $hasSupplierPayments = SupplierPayment::where('payment_method_id', $paymentMethod->id)->exists();

        if ($hasPayments || $hasRefunds || $hasSupplierPayments) {
            return response()->json([
                'message' => 'Cannot delete payment method with associated payment or settlement ledger records. Deactivate it instead.',
            ], 409);
        }

        $paymentMethod->delete();

        return response()->json([
            'message' => 'Payment method deleted successfully.',
        ]);
    }
}
