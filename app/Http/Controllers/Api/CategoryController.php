<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Category::query()->latest()->paginate());
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json($category);
    }

    public function store(Request $request): JsonResponse
    {
        $category = Category::create($request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string'],
        ]));

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $category->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category)],
            'description' => ['sometimes', 'nullable', 'string'],
        ]));

        return response()->json($category->refresh());
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'This category cannot be deleted while it has products.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ], 200);
    }
}