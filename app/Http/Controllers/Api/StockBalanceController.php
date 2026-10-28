<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockBalanceController extends Controller
{
    /**
     * GET /api/stock-balances
     * Query inventory balances across stores, locations, and product variants
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockBalance::with([
            'stockLocation.store',
            'productVariant.product',
        ])->latest();

        if ($request->filled('stock_location_id')) {
            $query->where('stock_location_id', $request->query('stock_location_id'));
        }

        if ($request->filled('store_id')) {
            $storeId = $request->query('store_id');
            $query->whereHas('stockLocation', function ($q) use ($storeId) {
                $q->where('store_id', $storeId);
            });
        }

        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->query('product_variant_id'));
        }

        if ($request->filled('product_id')) {
            $productId = $request->query('product_id');
            $query->whereHas('productVariant', function ($q) use ($productId) {
                $q->where('product_id', $productId);
            });
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity_on_hand', '<=', 'reorder_level');
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/stock-balances/{stockBalance}
     * Get single stock balance record with location and variant details
     */
    public function show(StockBalance $stockBalance): JsonResponse
    {
        return response()->json(
            $stockBalance->load(['stockLocation.store', 'productVariant.product'])
                ->append('quantity_available')
        );
    }

    /**
     * POST /api/stock-balances
     * Initialize stock balance for a product variant at a specific location
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stock_location_id'  => [
                'required',
                'exists:stock_locations,id',
            ],
            'product_variant_id' => [
                'required',
                'exists:product_variants,id',
                Rule::unique('stock_balances')->where(function ($query) use ($request) {
                    return $query->where('stock_location_id', $request->input('stock_location_id'));
                }),
            ],
            'quantity_on_hand'   => ['required', 'numeric', 'min:0'],
            'quantity_reserved'  => ['nullable', 'numeric', 'min:0'],
            'reorder_level'      => ['nullable', 'numeric', 'min:0'],
        ]);

        $balance = StockBalance::create([
            'stock_location_id'  => $validated['stock_location_id'],
            'product_variant_id' => $validated['product_variant_id'],
            'quantity_on_hand'   => $validated['quantity_on_hand'],
            'quantity_reserved'  => $validated['quantity_reserved'] ?? 0.000,
            'reorder_level'      => $validated['reorder_level'] ?? 0.000,
        ]);

        return response()->json([
            'message'       => 'Stock balance initialized successfully.',
            'stock_balance' => $balance->load(['stockLocation.store', 'productVariant.product'])
                ->append('quantity_available'),
        ], 201);
    }

    /**
     * PUT/PATCH /api/stock-balances/{stockBalance}
     * Update stock balance or reorder threshold
     */
    public function update(Request $request, StockBalance $stockBalance): JsonResponse
    {
        $validated = $request->validate([
            'quantity_on_hand'  => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity_reserved' => ['sometimes', 'required', 'numeric', 'min:0'],
            'reorder_level'     => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        $stockBalance->update($validated);

        return response()->json([
            'message'       => 'Stock balance updated successfully.',
            'stock_balance' => $stockBalance->refresh()
                ->load(['stockLocation.store', 'productVariant.product'])
                ->append('quantity_available'),
        ]);
    }

    /**
     * DELETE /api/stock-balances/{stockBalance}
     * Remove stock balance record (only if on_hand is 0)
     */
    public function destroy(StockBalance $stockBalance): JsonResponse
    {
        if ($stockBalance->quantity_on_hand > 0 || $stockBalance->quantity_reserved > 0) {
            return response()->json([
                'message' => 'Cannot delete stock balance record while on-hand or reserved inventory is greater than zero.',
            ], 409);
        }

        $stockBalance->delete();

        return response()->json([
            'message' => 'Stock balance record deleted successfully.',
        ], 200);
    }
}
