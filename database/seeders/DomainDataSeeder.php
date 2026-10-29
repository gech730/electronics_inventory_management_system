<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductImage;
use App\Models\TaxRate;
use App\Models\StockReservation;
use App\Models\OrderItem;
use App\Models\SaleReturn;
use App\Models\SaleRefund;
use App\Models\Sale;
use App\Models\Order;

class DomainDataSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // 1. Roles & Permissions (Spatie tables)
        $roles = [
            ['name' => 'admin', 'guard_name' => 'web'],
            ['name' => 'manager', 'guard_name' => 'web'],
            ['name' => 'cashier', 'guard_name' => 'web'],
            ['name' => 'storekeeper', 'guard_name' => 'web'],
        ];
        foreach ($roles as $r) {
            DB::table('roles')->updateOrInsert(
                ['name' => $r['name'], 'guard_name' => $r['guard_name']],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        $permissions = [
            ['name' => 'manage-users', 'guard_name' => 'web'],
            ['name' => 'manage-products', 'guard_name' => 'web'],
            ['name' => 'manage-transfers', 'guard_name' => 'web'],
            ['name' => 'process-pos-sales', 'guard_name' => 'web'],
            ['name' => 'manage-finance', 'guard_name' => 'web'],
        ];
        foreach ($permissions as $p) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $p['name'], 'guard_name' => $p['guard_name']],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        $adminRole = DB::table('roles')->where('name', 'admin')->first();
        $managerRole = DB::table('roles')->where('name', 'manager')->first();
        $cashierRole = DB::table('roles')->where('name', 'cashier')->first();
        $allPerms = DB::table('permissions')->get();

        foreach ($allPerms as $perm) {
            DB::table('role_has_permissions')->updateOrInsert(
                ['permission_id' => $perm->id, 'role_id' => $adminRole->id]
            );
        }
        if ($cashierRole) {
            $posPerm = DB::table('permissions')->where('name', 'process-pos-sales')->first();
            if ($posPerm) {
                DB::table('role_has_permissions')->updateOrInsert(
                    ['permission_id' => $posPerm->id, 'role_id' => $cashierRole->id]
                );
            }
        }

        $adminUser = User::where('role', 'admin')->first();
        $managerUser = User::where('email', 'manager@electronics.test')->first() ?: User::where('role', 'manager')->first();
        $cashierUser = User::where('email', 'cashier@electronics.test')->first() ?: User::where('role', 'cashier')->first();

        if ($adminUser && $adminRole) {
            DB::table('model_has_roles')->updateOrInsert([
                'role_id' => $adminRole->id,
                'model_type' => 'App\Models\User',
                'model_id' => $adminUser->id,
            ]);
        }
        if ($managerUser && $managerRole) {
            DB::table('model_has_roles')->updateOrInsert([
                'role_id' => $managerRole->id,
                'model_type' => 'App\Models\User',
                'model_id' => $managerUser->id,
            ]);
        }
        if ($cashierUser && $cashierRole) {
            DB::table('model_has_roles')->updateOrInsert([
                'role_id' => $cashierRole->id,
                'model_type' => 'App\Models\User',
                'model_id' => $cashierUser->id,
            ]);
        }

        if ($cashierUser) {
            $posPerm = DB::table('permissions')->where('name', 'process-pos-sales')->first();
            if ($posPerm) {
                DB::table('model_has_permissions')->updateOrInsert([
                    'permission_id' => $posPerm->id,
                    'model_type' => 'App\Models\User',
                    'model_id' => $cashierUser->id,
                ]);
            }
        }

        // 2. Product Images
        $p7 = Product::find(7);
        if ($p7) {
            ProductImage::updateOrInsert(
                ['product_id' => 7, 'is_primary' => true],
                [
                    'image_path' => '/assets/images/products/iphone-15-pro-max-natural.webp',
                    'alt_text' => 'iPhone 15 Pro Max 256GB Natural Titanium flagship edition',
                    'sort_order' => 1,
                    'created_at' => now(),
                ]
            );
        }
        $p6 = Product::find(6);
        if ($p6) {
            ProductImage::updateOrInsert(
                ['product_id' => 6, 'is_primary' => true],
                [
                    'image_path' => '/assets/images/products/macbook-pro-16-spaceblack.webp',
                    'alt_text' => 'Apple MacBook Pro 16 M3 Max Space Black workstation',
                    'sort_order' => 1,
                    'created_at' => now(),
                ]
            );
        }

        // 3. Product Tax Rates (Pivot)
        $variant1 = ProductVariant::find(1);
        $vatTax = TaxRate::where('code', 'VAT15')->first() ?: TaxRate::first();
        if ($variant1 && $vatTax) {
            DB::table('product_tax_rates')->updateOrInsert(
                ['product_variant_id' => $variant1->id, 'tax_rate_id' => $vatTax->id],
                ['created_at' => now()]
            );
        }

        $variant2 = ProductVariant::find(2);
        $totTax = TaxRate::where('code', 'TOT2')->first();
        if ($variant2 && $totTax) {
            DB::table('product_tax_rates')->updateOrInsert(
                ['product_variant_id' => $variant2->id, 'tax_rate_id' => $totTax->id],
                ['created_at' => now()]
            );
        }

        // 4. Stock Reservations
        $orderItem = OrderItem::first();
        if ($orderItem) {
            StockReservation::updateOrInsert(
                ['order_item_id' => $orderItem->id],
                [
                    'stock_location_id' => 1,
                    'product_variant_id' => $orderItem->product_variant_id,
                    'quantity' => $orderItem->quantity_ordered,
                    'status' => StockReservation::STATUS_ACTIVE,
                    'expires_at' => now()->addDays(5),
                    'created_by' => $managerUser ? $managerUser->id : 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 5. Sale Refunds
        $saleReturn = SaleReturn::first();
        if ($saleReturn) {
            SaleRefund::updateOrInsert(
                ['sale_return_id' => $saleReturn->id],
                [
                    'refund_number' => 'REF-' . date('Ymd') . '-001',
                    'payment_method_id' => 3, // Telebirr
                    'amount' => $saleReturn->refund_total > 0 ? $saleReturn->refund_total : 1199.00,
                    'status' => SaleRefund::STATUS_SUCCEEDED,
                    'transaction_reference' => 'TX-REF-TB-982143',
                    'refunded_at' => now(),
                    'processed_by' => $managerUser ? $managerUser->id : 1,
                    'notes' => 'Authorized warranty refund disbursed to customer mobile wallet',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 6. Queue tables: Jobs, Job Batches, Failed Jobs
        DB::table('jobs')->updateOrInsert(
            ['queue' => 'inventory-notifications'],
            [
                'payload' => json_encode([
                    'displayName' => 'App\\Jobs\\SendLowStockNotification',
                    'job' => 'Illuminate\\Queue\\CallQueuedHandler@call',
                    'maxTries' => 3,
                    'timeout' => 60,
                    'data' => [
                        'commandName' => 'App\\Jobs\\SendLowStockNotification',
                        'command' => serialize(new \stdClass()),
                    ],
                ]),
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => time(),
                'created_at' => time(),
            ]
        );

        DB::table('job_batches')->updateOrInsert(
            ['id' => 'batch_inventory_sync_20261029'],
            [
                'name' => 'Daily Inventory & Multi-Store Ledger Rebalance Batch',
                'total_jobs' => 12,
                'pending_jobs' => 0,
                'failed_jobs' => 0,
                'failed_job_ids' => '[]',
                'options' => json_encode(['notify_admin_on_completion' => true]),
                'cancelled_at' => null,
                'created_at' => time() - 3600,
                'finished_at' => time(),
            ]
        );

        DB::table('failed_jobs')->updateOrInsert(
            ['uuid' => 'e19b5247-497d-4c31-92f7-7817db238a90'],
            [
                'connection' => 'database',
                'queue' => 'external-webhooks',
                'payload' => json_encode([
                    'displayName' => 'App\\Jobs\\DispatchCarrierWebhookSync',
                    'data' => ['carrier' => 'DHL', 'tracking_number' => 'TRK-ETH-892134'],
                ]),
                'exception' => "GuzzleHttp\\Exception\\ConnectException: Connection timed out after 30000 milliseconds to carrier webhook gateway at api.dhl-express.et/v2/tracking/events",
                'failed_at' => now(),
            ]
        );
    }
}
