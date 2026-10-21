<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            $table->string('order_number', 50)->unique();

            // Source: online, pos, backoffice
            $table->string('source', 20);

            // Status: draft, pending_payment, placed, confirmed, processing, ready_for_pickup, shipped, completed, cancelled, rejected
            $table->string('status', 30)->default('draft');

            // Fulfillment: counter (immediate POS), pickup (click & collect), delivery
            $table->string('fulfillment_type', 20)->default('counter');

            // Customer (nullable for anonymous buyers/walk-ins)
            $table->foreignId('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();

            // Originating store and stock location
            $table->foreignId('store_id')
                ->nullable()
                ->constrained('stores')
                ->nullOnDelete();

            $table->foreignId('stock_location_id')
                ->nullable()
                ->constrained('stock_locations')
                ->nullOnDelete();

            // POS context (nullable for online orders)
            $table->foreignId('pos_register_id')
                ->nullable()
                ->constrained('pos_registers')
                ->nullOnDelete();

            $table->foreignId('cashier_shift_id')
                ->nullable()
                ->constrained('cashier_shifts')
                ->nullOnDelete();

            // Cashier/staff user (nullable for online self-checkout)
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Addresses
            $table->foreignId('billing_address_id')
                ->nullable()
                ->constrained('customer_addresses')
                ->nullOnDelete();

            $table->foreignId('shipping_address_id')
                ->nullable()
                ->constrained('customer_addresses')
                ->nullOnDelete();

            // Historical address snapshots
            $table->text('billing_address_snapshot')->nullable();
            $table->text('shipping_address_snapshot')->nullable();

            $table->string('currency_code', 3)->default('ETB');

            $table->decimal('subtotal', 14, 2)->default(0.00);
            $table->decimal('discount_total', 14, 2)->default(0.00);
            $table->decimal('tax_total', 14, 2)->default(0.00);
            $table->decimal('shipping_fee', 14, 2)->default(0.00);
            $table->decimal('grand_total', 14, 2)->default(0.00);

            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();

            $table->timestamp('placed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();

            // Performance indexes
            $table->index(['customer_id', 'created_at']);
            $table->index(['source', 'status', 'created_at']);
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
