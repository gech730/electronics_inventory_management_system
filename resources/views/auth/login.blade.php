
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Electronics Inventory</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="min-h-screen bg-slate-950 text-white">

    <main class="flex min-h-screen items-center justify-center px-4 py-10">

        <div class="w-full max-w-md">

            <!-- Logo and Brand -->
            <div class="mb-8 text-center">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center
                            justify-center rounded-2xl bg-blue-600
                            text-3xl font-bold shadow-lg">
                    E
                </div>

                <h1 class="text-3xl font-bold tracking-tight">
                    Electronics Inventory
                </h1>

                <p class="mt-2 text-sm text-slate-400">
                    Inventory Management System
                </p>
            </div>

            <!-- Login Card -->
            <div class="rounded-2xl border border-slate-800
                        bg-slate-900 p-6 shadow-2xl sm:p-8">

                <h2 class="text-2xl font-semibold">Welcome back</h2>

                <p class="mt-2 text-sm text-slate-400">
                    Sign in to access your account.
                </p>

                <!-- Error Messages -->
                @if ($errors->any())
                    <div class="mt-5 rounded-lg border border-red-800
                                bg-red-950/50 p-4 text-sm text-red-300">
                        @foreach ($errors->all() as $error)
                            <p>{{ $error }}</p>
                        @endforeach
                    </div>
                @endif

                <!-- Login Form -->
                <form method="POST" action="{{ url('/login') }}"
                      class="mt-6 space-y-5">

                    @csrf

                    <div>
                        <label for="email"
                               class="mb-2 block text-sm font-medium">
                            Email address
                        </label>

                        <input
                            type="email"
                            id="email"
                            name="email"
                            value="{{ old('email') }}"
                            placeholder="admin@example.com"
                            autocomplete="username"
                            required
                            autofocus
                            class="w-full rounded-lg border border-slate-700
                                   bg-slate-950 px-4 py-3 text-white
                                   outline-none transition
                                   placeholder:text-slate-600
                                   focus:border-blue-500
                                   focus:ring-2 focus:ring-blue-500/20"
                        >
                    </div>

                    <div>
                        <label for="password"
                               class="mb-2 block text-sm font-medium">
                            Password
                        </label>

                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter your password"
                            autocomplete="current-password"
                            required
                            class="w-full rounded-lg border border-slate-700
                                   bg-slate-950 px-4 py-3 text-white
                                   outline-none transition
                                   placeholder:text-slate-600
                                   focus:border-blue-500
                                   focus:ring-2 focus:ring-blue-500/20"
                        >
                    </div>

                    <button
                        type="submit"
                        class="w-full rounded-lg bg-blue-600 px-4 py-3
                               font-semibold text-white transition
                               hover:bg-blue-500
                               focus:outline-none focus:ring-2
                               focus:ring-blue-400 focus:ring-offset-2
                               focus:ring-offset-slate-900"
                    >
                        Sign In
                    </button>

                </form>

                <p class="mt-6 text-center text-xs text-slate-500">
                    Authorized staff only. Contact your administrator
                    to obtain an account.
                </p>
            </div>

            <p class="mt-6 text-center text-xs text-slate-600">
                &copy; {{ date('Y') }} Electronics Inventory
            </p>

        </div>
    </main>

</body>
</html>
