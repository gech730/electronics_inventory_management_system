
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products</title>
</head>
<body>
    <h1>Electronic Products</h1>

    @if (session('success'))
        <p style="color: green;">{{ session('success') }}</p>
    @endif

    @if (in_array(auth()->user()->role, ['admin', 'manager']))
    <a href="{{ route('products.create') }}">+ Add Product</a>
    @endif
    
    <a href="{{ route('categories.index') }}">Categories</a>

    @if ($products->isEmpty())
        <p>No products yet.</p>
    @else
        <table border="1" cellpadding="8">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Cost Price</th>
                    <th>Selling Price</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($products as $product)
                    <tr>
                        <td>{{ $product->name }}</td>
                        <td>{{ $product->sku }}</td>
                        <td>{{ $product->category->name }}</td>
                        <td>{{ $product->brand ?? 'N/A' }}</td>
                        <td>{{ number_format($product->cost_price, 2) }}</td>
                        <td>{{ number_format($product->selling_price, 2) }}</td>
                        <td>{{ $product->quantity }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
