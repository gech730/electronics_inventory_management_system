<?php

namespace App\Http\Controllers;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    //




    // Display all categories
    public function index()
    {
        $categories = Category::latest()->get();

        return view('categories.index', compact('categories'));
    }

    // Show the form for creating a category
    public function create()
    {
        return view('categories.create');
    }

    // Save a new category
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string',
        ]);

        Category::create($validated);

        return redirect()
            ->route('categories.index')
            ->with('success', 'Category created successfully.');
    }

}
