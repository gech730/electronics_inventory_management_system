<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    /**
     * GET /api/brands
     * List all electronics brands (Apple, Samsung, Sony, etc.)
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Brand::query()
                ->withCount('products')
                ->latest()
                ->paginate()
        );
    }

    /**
     * GET /api/brands/{brand}
     * View single brand and all its products
     */
    public function show(Brand $brand): JsonResponse
    {
        return response()->json($brand->load('products'));
    }

    /**
     * POST /api/brands
     * Create a new electronics brand
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:brands,name'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $brand = Brand::create($validated);

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => $brand,
        ], 201);
    }

    /**
     * PUT/PATCH /api/brands/{brand}
     * Update an existing brand
     */
    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('brands', 'name')->ignore($brand)],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $brand->update($validated);

        return response()->json([
            'message' => 'Brand updated successfully.',
            'brand' => $brand->refresh(),
        ]);
    }

    /**
     * DELETE /api/brands/{brand}
     * Delete brand with safety check for existing products
     */
    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            return response()->json([
                'message' => 'This brand cannot be deleted while it has products assigned to it.',
            ], 409);
        }

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully.',
        ], 200);
    }
}
