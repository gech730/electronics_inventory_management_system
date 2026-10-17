
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Electronics Inventory</title>
</head>
<body>
    @if (session('error'))
    <p style="color: red;">
        {{ session('error') }}
    </p>
@endif 

    <h1>Electronics Inventory Dashboard</h1>

    <p>Welcome, {{ auth()->user()->name }}!</p>
    <p>Your role: {{ auth()->user()->role }}</p>

    
@if (auth()->user()->role === 'admin')
    <hr>

    <h2>Administration</h2>

    <a href="{{ route('admin.users.index') }}">
        User Management
    </a>

    <p>Create staff accounts and manage their roles.</p>

    <a href="{{ url('/categories') }}">Manage Categories</a>
    <br>
    <a href="{{ url('/products') }}">Manage Products</a>
@endif

    <a href="{{ url('/categories') }}"> Categories</a>
    <br>
    <a href="{{ url('/products') }}"> Products</a>

    <br><br>

    <form action="{{ url('/logout') }}" method="POST">
        @csrf
        <button type="submit">Logout</button>
    </form>
</body>
</html>
