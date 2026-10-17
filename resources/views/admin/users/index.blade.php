
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Management</title>
</head>
<body>
    <h1>Staff Management</h1>

<a href="{{ url('/dashboard') }}">Dashboard</a>
    |
    <a href="{{ route('admin.users.create') }}">Create Staff Account</a>

    @if (session('success'))
        <p style="color: green;">{{ session('success') }}</p>
    @endif

    <table border="1" cellpadding="10">
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($users as $user)
                <tr>
                    <td>{{ $user->name }}</td>
                    <td>{{ $user->email }}</td>
                    <td>{{ ucfirst($user->role ?? 'unassigned') }}</td>
                    <td>{{ $user->created_at->format('Y-m-d') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4">No users found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
