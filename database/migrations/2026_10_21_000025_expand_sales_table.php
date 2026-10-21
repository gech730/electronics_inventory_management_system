<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('sale_number', 50)->unique()->after('id');

            $table->foreignId('order_id')
                ->after('sale_number')
                ->constrained('orders')
                ->cascadeOnDelete();

            $table->foreignId('customer_id')
                ->nullable()
                ->after('order_id')
                ->constrained('customers')
                ->nullOnDelete();

            $table->foreignId('store_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('stores')
                ->nullOnDelete();

            $table->foreignId('stock_location_id')
                ->nullable()
                ->after('store_id')
                ->constrained('stock_locations')
                ->nullOnDelete();

            $table->foreignId('cashier_shift_id')
                ->nullable()
                ->after('stock_location_id')
                ->constrained('cashier_shifts')
                ->nullOnDelete();

            $table->foreignId('cashier_id')
                ->nullable()
                ->after('cashier_shift_id')
                ->constrained('users')
                ->nullOnDelete();

            // Status: posted, voided, partially_returned, returned
            $table->string('status', 30)->default('posted');

            // Payment status: unpaid, partially_paid, paid, overpaid, partially_refunded, refunded
            $table->string('payment_status', 30)->default('unpaid');

            $table->string('currency_code', 3)->default('ETB');

            $table->decimal('subtotal', 14, 2)->default(0.00);
            $table->decimal('discount_total', 14, 2)->default(0.00);
            $table->decimal('tax_total', 14, 2)->default(0.00);
            $table->decimal('shipping_fee', 14, 2)->default(0.00);
            $table->decimal('grand_total', 14, 2)->default(0.00);

            // Credit sales terms
            $table->integer('credit_terms_days')->default(0);
            $table->date('due_date')->nullable();

            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('voided_at')->nullable();
            $table->text('notes')->nullable();

            // Handle legacy columns
            if (Schema::hasColumn('sales', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->unsignedBigInteger('user_id')->nullable()->change();
            }
            if (Schema::hasColumn('sales', 'total_amount')) {
                $table->decimal('total_amount', 14, 2)->nullable()->change();
            }

            $table->index(['customer_id', 'issued_at']);
            $table->index(['store_id', 'issued_at']);
            $table->index(['payment_status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['store_id']);
            $table->dropForeign(['stock_location_id']);
            $table->dropForeign(['cashier_shift_id']);
            $table->dropForeign(['cashier_id']);

            $table->dropColumn([
                'sale_number',
                'order_id',
                'customer_id',
                'store_id',
                'stock_location_id',
                'cashier_shift_id',
                'cashier_id',
                'status',
                'payment_status',
                'currency_code',
                'subtotal',
                'discount_total',
                'tax_total',
                'shipping_fee',
                'grand_total',
                'credit_terms_days',
                'due_date',
                'issued_at',
                'voided_at',
                'notes',
            ]);
        });
    }
};
