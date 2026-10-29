<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'customer',
        ]);

        // Link or create Customer record for this user
        $customerCode = 'CUST-' . date('Ymd') . '-' . strtoupper(Str::random(4));
        Customer::create([
            'user_id' => $user->id,
            'customer_code' => $customerCode,
            'customer_type' => Customer::TYPE_INDIVIDUAL,
            'display_name' => $user->name,
            'email' => $user->email,
            'phone' => $validated['phone'] ?? null,
            'is_active' => true,
        ]);

        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 1440));

        $token = $user->createToken(
            name: 'inventory-api',
            abilities: ['*'],
            expiresAt: $expiresAt
        );

        return response()->json([
            'message' => 'Account created successfully. Welcome to Ngus Electronics!',
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ], 201);
    }
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The email or password is incorrect.'], 401);
        }

        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 1440));

        $token = $user->createToken(
            name: 'inventory-api',
            abilities: ['*'],
            expiresAt: $expiresAt
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $accessToken = $request->user()->currentAccessToken();

        if ($accessToken && method_exists($accessToken, 'delete')) {
            $accessToken->delete();
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user()->only(['id', 'name', 'email', 'role']));
    }
}