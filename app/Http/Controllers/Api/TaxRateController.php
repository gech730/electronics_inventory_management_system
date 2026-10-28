<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaxRateController extends Controller
{
    /**
     * Display a listing of tax rates.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TaxRate::query();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $taxRates = $query->orderBy('name')->get();

        return response()->json($taxRates);
    }

    /**
     * Display the specified tax rate.
     */
    public function show(TaxRate $taxRate): JsonResponse
    {
        $taxRate->loadCount('variants');

        return response()->json($taxRate);
    }

    /**
     * Store a newly created tax rate.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'           => ['required', 'string', 'max:50', 'unique:tax_rates,code'],
            'name'           => ['required', 'string', 'max:100'],
            'rate_percent'   => ['required', 'numeric', 'min:0', 'max:100'],
            'is_inclusive'   => ['nullable', 'boolean'],
            'is_active'      => ['nullable', 'boolean'],
            'effective_from' => ['nullable', 'date'],
            'effective_to'   => ['nullable', 'date', 'after_or_equal:effective_from'],
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['is_inclusive'] = $validated['is_inclusive'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $taxRate = TaxRate::create($validated);

        return response()->json([
            'message'  => 'Tax rate created successfully.',
            'tax_rate' => $taxRate,
        ], 201);
    }

    /**
     * Update the specified tax rate.
     */
    public function update(Request $request, TaxRate $taxRate): JsonResponse
    {
        $validated = $request->validate([
            'code'           => ['sometimes', 'string', 'max:50', 'unique:tax_rates,code,' . $taxRate->id],
            'name'           => ['sometimes', 'string', 'max:100'],
            'rate_percent'   => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'is_inclusive'   => ['sometimes', 'boolean'],
            'is_active'      => ['sometimes', 'boolean'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_to'   => ['sometimes', 'nullable', 'date', 'after_or_equal:effective_from'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $taxRate->update($validated);

        return response()->json([
            'message'  => 'Tax rate updated successfully.',
            'tax_rate' => $taxRate->fresh(),
        ]);
    }

    /**
     * Remove the specified tax rate with variant link guards.
     */
    public function destroy(TaxRate $taxRate): JsonResponse
    {
        $isLinked = DB::table('product_tax_rates')->where('tax_rate_id', $taxRate->id)->exists();

        if ($isLinked) {
            return response()->json([
                'message' => 'Cannot delete tax rate that is currently mapped to product variants. Deactivate it instead.',
            ], 409);
        }

        $taxRate->delete();

        return response()->json([
            'message' => 'Tax rate deleted successfully.',
        ]);
    }
}
