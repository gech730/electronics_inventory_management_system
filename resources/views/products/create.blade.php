
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Product</title>
</head>
<body>
    <h1>Add Electronic Product</h1>

    <a href="{{ route('products.index') }}">Back to Products</a>

    @if ($errors->any())
        <ul style="color: red;">
            @foreach ($errors->all() as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
    @endif

    @if ($categories->isEmpty())
        <p>Create a category before adding a product.</p>
        <a href="{{ route('categories.create') }}">Create Category</a>
    @else
        <form action="{{ route('products.store') }}" method="POST">
            @csrf

            <div>
                <label>Category</label>
                <select name="category_id" required>
                    <option value="">Select category</option>
                    @foreach ($categories as $category)
                        <option value="{{ $category->id }}"
                            @selected(old('category_id') == $category->id)>
                            {{ $category->name }}
                        </option>
                    @endforeach
                </select>
            </div>

            <div>
                <label>Product Name</label>
                <input name="name" value="{{ old('name') }}" required>
            </div>

            <div>
                <label>SKU (unique product code)</label>
                <input name="sku" value="{{ old('sku') }}" required>
            </div>

            <div>
                <label>Brand</label>
                <input name="brand" value="{{ old('brand') }}">
            </div>

            <div>
                <label>Model Number</label>
                <input name="model_number" value="{{ old('model_number') }}">
            </div>

            <div>
                <label>Cost Price</label>
                <input type="number" name="cost_price"
                       min="0" step="0.01"
                       value="{{ old('cost_price') }}" required>
            </div>

            <div>
                <label>Selling Price</label>
                <input type="number" name="selling_price"
                       min="0" step="0.01"
                       value="{{ old('selling_price') }}" required>
            </div>

            <div>
                <label>Quantity</label>
                <input type="number" name="quantity"
                       min="0" value="{{ old('quantity', 0) }}" required>
            </div>

            <div>
                <label>Minimum Stock Alert</label>
                <input type="number" name="minimum_stock"
                       min="0" value="{{ old('minimum_stock', 5) }}" required>
            </div>

            <button type="submit">Save Product</button>
        </form>
    @endif
</body>
</html>
