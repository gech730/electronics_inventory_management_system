<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffUserSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Admin Account
        User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // Store Manager Account
        User::firstOrCreate(
            ['email' => 'manager@electronics.test'],
            [
                'name' => 'Store Manager Dawit',
                'password' => Hash::make('password'),
                'role' => 'manager',
                'email_verified_at' => now(),
            ]
        );

        // Front Desk Cashier Account
        User::firstOrCreate(
            ['email' => 'cashier@electronics.test'],
            [
                'name' => 'Front Desk Cashier Selam',
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'email_verified_at' => now(),
            ]
        );
    }
}
