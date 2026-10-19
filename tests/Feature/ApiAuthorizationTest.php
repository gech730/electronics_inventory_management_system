<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_login_issues_a_token_that_authenticates_the_user(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'password' => Hash::make('secret-password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])->assertOk()->assertJsonPath('user.role', 'admin');

        $this->withToken($response->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_only_admins_can_change_categories(): void
    {
        $category = Category::create(['name' => 'Phones']);

        Sanctum::actingAs(User::factory()->create(['role' => 'manager']));
        $this->postJson('/api/categories', ['name' => 'Tablets'])->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->patchJson("/api/categories/{$category->id}", ['name' => 'Mobile devices'])
            ->assertOk()
            ->assertJsonPath('name', 'Mobile devices');
    }

    public function test_admin_can_create_staff_users_through_both_api_paths(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $manager = [
            'name' => 'API Manager',
            'email' => 'api-manager@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'role' => 'manager',
        ];

        $this->postJson('/api/admin/users/create', $manager)
            ->assertCreated()
            ->assertJsonPath('user.role', 'manager')
            ->assertJsonMissingPath('user.password');

        $cashier = [...$manager, 'email' => 'api-cashier@example.com', 'role' => 'cashier'];

        $this->postJson('/api/admin/users', $cashier)
            ->assertCreated()
            ->assertJsonPath('user.role', 'cashier');
    }

    public function test_only_admins_can_create_staff_users_through_api(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'manager']));

        $this->postJson('/api/admin/users/create', [
            'name' => 'Blocked User',
            'email' => 'blocked@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'role' => 'cashier',
        ])->assertForbidden();
    }

    public function test_managers_can_manage_products_but_cannot_delete_them(): void
    {
        $category = Category::create(['name' => 'Phones']);
        Sanctum::actingAs(User::factory()->create(['role' => 'manager']));

        $response = $this->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'Phone X',
            'sku' => 'PHONE-X',
            'cost_price' => 500,
            'selling_price' => 700,
            'quantity' => 10,
            'minimum_stock' => 2,
        ])->assertCreated();

        $productId = $response->json('id');

        $this->getJson('/api/products')->assertOk()->assertJsonFragment(['sku' => 'PHONE-X']);
        $this->patchJson("/api/products/{$productId}", ['quantity' => 8])
            ->assertOk()
            ->assertJsonPath('quantity', 8);
        $this->deleteJson("/api/products/{$productId}")->assertForbidden();
    }

    public function test_cashiers_can_only_view_their_own_sales(): void
    {
        $cashier = User::factory()->create(['role' => 'cashier']);
        $otherCashier = User::factory()->create(['role' => 'cashier']);
        $ownSale = Sale::create(['user_id' => $cashier->id, 'total_amount' => 125.50]);
        $otherSale = Sale::create(['user_id' => $otherCashier->id, 'total_amount' => 80]);

        Sanctum::actingAs($cashier);

        $this->getJson('/api/sales')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownSale->id);

        $this->getJson("/api/sales/{$otherSale->id}")->assertNotFound();
    }
}