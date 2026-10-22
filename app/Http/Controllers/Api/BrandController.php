<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
