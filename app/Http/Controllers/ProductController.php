<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;

use Illuminate\Http\Request;

class ProductController extends Controller
{
    //
    public function index()
    {
        $products = Product::with('category')->latest()->get();

        return view('products.index', compact('products'));
    }

    public function create()
    {
        $categories = Category::orderBy('name')->get();

        return view('products.create', compact('categories'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'sku' => 'required|string|max:255|unique:products,sku',
            'brand' => 'nullable|string|max:255',
            'model_number' => 'nullable|string|max:255',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'minimum_stock' => 'required|integer|min:0',
        ]);

        Product::create($validated);

        return redirect()
            ->route('products.index')
            ->with('success', 'Product added successfully.');
    }
}
