<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StoreController extends Controller
{
    /**
     * GET /api/stores
     * List all retail stores / branch locations
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Store::query()
                ->withCount('stockLocations')
                ->latest()
                ->paginate()
        );
    }

    /**
     * GET /api/stores/{store}
     * Get single store details with all its stock locations
     */
    public function show(Store $store): JsonResponse
    {
        return response()->json($store->load('stockLocations'));
    }

    /**
     * POST /api/stores
     * Create a new store / branch
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'      => ['required', 'string', 'max:30', 'unique:stores,code'],
            'name'      => ['required', 'string', 'max:150'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email', 'max:255'],
            'address'   => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $store = Store::create($validated);

        return response()->json([
            'message' => 'Store created successfully.',
            'store'   => $store,
        ], 201);
    }

    /**
     * PUT/PATCH /api/stores/{store}
     * Update store details
     */
    public function update(Request $request, Store $store): JsonResponse
    {
        $validated = $request->validate([
            'code'      => ['sometimes', 'required', 'string', 'max:30', Rule::unique('stores', 'code')->ignore($store)],
            'name'      => ['sometimes', 'required', 'string', 'max:150'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'     => ['sometimes', 'nullable', 'email', 'max:255'],
            'address'   => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $store->update($validated);

        return response()->json([
            'message' => 'Store updated successfully.',
            'store'   => $store->refresh(),
        ]);
    }

    /**
     * DELETE /api/stores/{store}
     * Delete store with dependency check
     */
    public function destroy(Store $store): JsonResponse
    {
        if ($store->stockLocations()->exists()) {
            return response()->json([
                'message' => 'This store cannot be deleted while it has stock locations assigned to it.',
            ], 409);
        }

        if ($store->posRegisters()->exists()) {
            return response()->json([
                'message' => 'This store cannot be deleted while POS registers are registered to it.',
            ], 409);
        }

        $store->delete();

        return response()->json([
            'message' => 'Store deleted successfully.',
        ], 200);
    }
}
