
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Create Staff Account</title>
</head>
<body>
    <h1>Create Staff Account</h1>

    <a href="{{ route('admin.users.index') }}">Back to Users</a>

    @if ($errors->any())
        <div style="color: red;">
            @foreach ($errors->all() as $error)
                <p>{{ $error }}</p>
            @endforeach
        </div>
    @endif

    <form method="POST" action="{{ route('admin.users.store') }}">
        @csrf

        <div>
            <label for="name">Full Name</label><br>
            <input
                id="name"
                name="name"
                value="{{ old('name') }}"
                required
            >
        </div>

        <br>

        <div>
            <label for="email">Email</label><br>
            <input
                type="email"
                id="email"
                name="email"
                value="{{ old('email') }}"
                required
            >
        </div>

        <br>

        <div>
            <label for="role">Staff Role</label><br>
            <select id="role" name="role" required>
                <option value="">Choose a role</option>
                <option value="manager" @selected(old('role') === 'manager')>
                    Manager
                </option>
                <option value="cashier" @selected(old('role') === 'cashier')>
                    Cashier
                </option>
                <option value="storekeeper" @selected(old('role') === 'storekeeper')>
                    Storekeeper
                </option>
            </select>
        </div>

        <br>

        <div>
            <label for="password">Temporary Password</label><br>
            <input
                type="password"
                id="password"
                name="password"
                minlength="8"
                required
            >
        </div>

        <br>

        <div>
            <label for="password_confirmation">Confirm Password</label><br>
            <input
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                minlength="8"
                required
            >
        </div>

        <br>

        <button type="submit">Create Staff Account</button>
    </form>
</body>
</html>
