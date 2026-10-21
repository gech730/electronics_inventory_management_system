<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();

            $table->string('purchase_order_number', 50)->unique();

            $table->foreignId('supplier_id')
                ->constrained('suppliers')
                ->restrictOnDelete();

            $table->foreignId('store_id')
                ->constrained('stores')
                ->restrictOnDelete();

            $table->foreignId('destination_stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            // Status: draft, submitted, approved, partially_received, received, cancelled
            $table->string('status', 30)->default('draft');

            $table->string('currency_code', 3)->default('ETB');

            $table->timestamp('ordered_at')->nullable();
            $table->timestamp('expected_at')->nullable();

            $table->decimal('subtotal', 14, 2)->default(0.00);
            $table->decimal('discount_total', 14, 2)->default(0.00);
            $table->decimal('tax_total', 14, 2)->default(0.00);
            $table->decimal('grand_total', 14, 2)->default(0.00);

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['supplier_id', 'status']);
            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
