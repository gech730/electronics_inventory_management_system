
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categories</title>
</head>
<body>
    <h1>Product Categories</h1>

    @if (session('success'))
        <p style="color: green;">{{ session('success') }}</p>
    @endif
    
     @if (in_array(auth()->user()->role, ['admin', 'manager']))
    <a href="{{ route('categories.create') }}">+ Add Category</a>
       @endif
       
    @if ($categories->isEmpty())
        <p>No categories yet. Add your first category.</p>
    @else
        <table border="1" cellpadding="10">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                </tr>
            </thead>

            <tbody>
                @foreach ($categories as $category)
                    <tr>
                        <td>{{ $category->id }}</td>
                        <td>{{ $category->name }}</td>
                        <td>{{ $category->description ?? 'N/A' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
