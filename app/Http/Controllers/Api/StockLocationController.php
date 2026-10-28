<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockLocationController extends Controller
{
    /**
     * GET /api/stock-locations
     * List stock locations (warehouses, shop floors, transit bays, etc.)
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockLocation::with('store')->latest();

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        if ($request->filled('location_type')) {
            $query->where('location_type', $request->query('location_type'));
        }

        if ($request->has('is_sellable')) {
            $query->where('is_sellable', $request->boolean('is_sellable'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/stock-locations/{stockLocation}
     * Get single stock location with its store details
     */
    public function show(StockLocation $stockLocation): JsonResponse
    {
        return response()->json($stockLocation->load(['store', 'stockBalances.productVariant.product']));
    }

    /**
     * POST /api/stock-locations
     * Create a new stock location
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id'      => ['nullable', 'exists:stores,id'],
            'code'          => ['required', 'string', 'max:30', 'unique:stock_locations,code'],
            'name'          => ['required', 'string', 'max:120'],
            'location_type' => ['required', 'string', Rule::in(StockLocation::$types)],
            'is_sellable'   => ['nullable', 'boolean'],
            'is_active'     => ['nullable', 'boolean'],
        ]);

        $location = StockLocation::create($validated);

        return response()->json([
            'message'        => 'Stock location created successfully.',
            'stock_location' => $location->load('store'),
        ], 201);
    }

    /**
     * PUT/PATCH /api/stock-locations/{stockLocation}
     * Update an existing stock location
     */
    public function update(Request $request, StockLocation $stockLocation): JsonResponse
    {
        $validated = $request->validate([
            'store_id'      => ['sometimes', 'nullable', 'exists:stores,id'],
            'code'          => ['sometimes', 'required', 'string', 'max:30', Rule::unique('stock_locations', 'code')->ignore($stockLocation)],
            'name'          => ['sometimes', 'required', 'string', 'max:120'],
            'location_type' => ['sometimes', 'required', 'string', Rule::in(StockLocation::$types)],
            'is_sellable'   => ['sometimes', 'boolean'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $stockLocation->update($validated);

        return response()->json([
            'message'        => 'Stock location updated successfully.',
            'stock_location' => $stockLocation->refresh()->load('store'),
        ]);
    }

    /**
     * DELETE /api/stock-locations/{stockLocation}
     * Delete location with safety check for on-hand stock
     */
    public function destroy(StockLocation $stockLocation): JsonResponse
    {
        // Guard against deleting location that currently holds inventory
        $hasStock = $stockLocation->stockBalances()->where('quantity_on_hand', '>', 0)->exists();

        if ($hasStock) {
            return response()->json([
                'message' => 'Cannot delete stock location while it currently contains inventory on hand.',
            ], 409);
        }

        $stockLocation->delete();

        return response()->json([
            'message' => 'Stock location deleted successfully.',
        ], 200);
    }
}
