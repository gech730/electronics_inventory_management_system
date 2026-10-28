<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * GET /api/suppliers
     * List suppliers with optional search and active status filter
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query()->withCount('purchaseOrders')->latest();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/suppliers/{supplier}
     * Get single supplier details with purchase orders
     */
    public function show(Supplier $supplier): JsonResponse
    {
        return response()->json($supplier->load(['purchaseOrders' => function ($q) {
            $q->latest()->limit(10);
        }]));
    }

    /**
     * POST /api/suppliers
     * Register a new supplier
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_code'      => ['required', 'string', 'max:40', 'unique:suppliers,supplier_code'],
            'name'               => ['required', 'string', 'max:180'],
            'contact_person'     => ['nullable', 'string', 'max:150'],
            'phone'              => ['nullable', 'string', 'max:30'],
            'email'              => ['nullable', 'email', 'max:255'],
            'tax_number'         => ['nullable', 'string', 'max:80'],
            'address'            => ['nullable', 'string'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0'],
            'is_active'          => ['nullable', 'boolean'],
            'notes'              => ['nullable', 'string'],
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'message'  => 'Supplier registered successfully.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * PUT/PATCH /api/suppliers/{supplier}
     * Update supplier details
     */
    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'supplier_code'      => ['sometimes', 'required', 'string', 'max:40', Rule::unique('suppliers', 'supplier_code')->ignore($supplier)],
            'name'               => ['sometimes', 'required', 'string', 'max:180'],
            'contact_person'     => ['sometimes', 'nullable', 'string', 'max:150'],
            'phone'              => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'              => ['sometimes', 'nullable', 'email', 'max:255'],
            'tax_number'         => ['sometimes', 'nullable', 'string', 'max:80'],
            'address'            => ['sometimes', 'nullable', 'string'],
            'payment_terms_days' => ['sometimes', 'integer', 'min:0'],
            'is_active'          => ['sometimes', 'boolean'],
            'notes'              => ['sometimes', 'nullable', 'string'],
        ]);

        $supplier->update($validated);

        return response()->json([
            'message'  => 'Supplier updated successfully.',
            'supplier' => $supplier->refresh(),
        ]);
    }

    /**
     * DELETE /api/suppliers/{supplier}
     * Delete supplier with purchase order dependency check
     */
    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->purchaseOrders()->exists()) {
            return response()->json([
                'message' => 'This supplier cannot be deleted because purchase orders are associated with it.',
            ], 409);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ], 200);
    }
}
