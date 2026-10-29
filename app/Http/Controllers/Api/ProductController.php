<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Product::with(['category', 'brand', 'images', 'primaryImage'])->latest()->paginate());
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'brand', 'images', 'primaryImage']));
    }

    public function store(Request $request, CloudinaryService $cloudinaryService): JsonResponse
    {
        $validated = $request->validate([
            'category_id'   => ['required', 'exists:categories,id'],
            'brand_id'      => ['nullable', 'exists:brands,id'],
            'name'          => ['required', 'string', 'max:255'],
            'sku'           => ['required', 'string', 'max:255', 'unique:products,sku'],
            'brand'         => ['nullable', 'string', 'max:255'],
            'model_number'  => ['nullable', 'string', 'max:255'],
            'cost_price'    => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'quantity'      => ['required', 'integer', 'min:0'],
            'minimum_stock' => ['required', 'integer', 'min:0'],
            'image'         => ['nullable'],
            'image_url'     => ['nullable', 'string'],
        ]);

        $productData = collect($validated)->except(['image', 'image_url'])->toArray();
        $product = Product::create($productData);

        // Process image upload if provided
        $imageFile = $request->file('image') ?? $request->input('image') ?? $request->input('image_url');
        if ($imageFile) {
            $uploadResult = $cloudinaryService->uploadImage($imageFile, 'electronics_inventory/products', "prod_{$product->id}_" . time());
            if (!empty($uploadResult['url'])) {
                $product->images()->create([
                    'image_path' => $uploadResult['url'],
                    'alt_text'   => $product->name,
                    'sort_order' => 0,
                    'is_primary' => true,
                ]);
            }
        }

        return response()->json($product->load(['category', 'brand', 'images', 'primaryImage']), 201);
    }

    public function update(Request $request, Product $product, CloudinaryService $cloudinaryService): JsonResponse
    {
        $validated = $request->validate([
            'category_id'   => ['sometimes', 'required', 'exists:categories,id'],
            'brand_id'      => ['sometimes', 'nullable', 'exists:brands,id'],
            'name'          => ['sometimes', 'required', 'string', 'max:255'],
            'sku'           => ['sometimes', 'required', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product)],
            'brand'         => ['sometimes', 'nullable', 'string', 'max:255'],
            'model_number'  => ['sometimes', 'nullable', 'string', 'max:255'],
            'cost_price'    => ['sometimes', 'required', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity'      => ['sometimes', 'required', 'integer', 'min:0'],
            'minimum_stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'image'         => ['nullable'],
            'image_url'     => ['nullable', 'string'],
        ]);

        $productData = collect($validated)->except(['image', 'image_url'])->toArray();
        $product->update($productData);

        // If a new image is provided on update
        $imageFile = $request->file('image') ?? $request->input('image') ?? $request->input('image_url');
        if ($imageFile) {
            $uploadResult = $cloudinaryService->uploadImage($imageFile, 'electronics_inventory/products', "prod_{$product->id}_" . time());
            if (!empty($uploadResult['url'])) {
                // Set existing images is_primary to false
                $product->images()->update(['is_primary' => false]);

                $product->images()->create([
                    'image_path' => $uploadResult['url'],
                    'alt_text'   => $product->name,
                    'sort_order' => 0,
                    'is_primary' => true,
                ]);
            }
        }

        return response()->json($product->refresh()->load(['category', 'brand', 'images', 'primaryImage']));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ], 200);
    }

    /**
     * Dedicated image upload endpoint for an existing product
     */
    public function uploadImage(Request $request, Product $product, CloudinaryService $cloudinaryService): JsonResponse
    {
        $request->validate([
            'image' => ['required'],
        ]);

        $imageFile = $request->file('image') ?? $request->input('image');
        $uploadResult = $cloudinaryService->uploadImage($imageFile, 'electronics_inventory/products', "prod_{$product->id}_" . time());

        $image = $product->images()->create([
            'image_path' => $uploadResult['url'],
            'alt_text'   => $request->input('alt_text', $product->name),
            'sort_order' => $product->images()->count(),
            'is_primary' => $request->boolean('is_primary', $product->images()->count() === 0),
        ]);

        return response()->json([
            'message' => 'Image uploaded successfully.',
            'image'   => $image,
            'product' => $product->fresh()->load(['category', 'brand', 'images', 'primaryImage']),
        ], 201);
    }

    /**
     * Delete a product image
     */
    public function deleteImage(ProductImage $productImage, CloudinaryService $cloudinaryService): JsonResponse
    {
        $product = $productImage->product;
        $productImage->delete();

        // If the deleted image was primary, set the first remaining image as primary
        if ($productImage->is_primary && $product) {
            $next = $product->images()->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return response()->json([
            'message' => 'Product image removed successfully.',
            'product' => $product ? $product->fresh()->load(['category', 'brand', 'images', 'primaryImage']) : null,
        ]);
    }
}