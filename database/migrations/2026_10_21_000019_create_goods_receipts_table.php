<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();

            $table->string('receipt_number', 50)->unique();

            // Nullable for direct/standalone receipts not tied to a PO
            $table->foreignId('purchase_order_id')
                ->nullable()
                ->constrained('purchase_orders')
                ->nullOnDelete();

            $table->foreignId('supplier_id')
                ->constrained('suppliers')
                ->restrictOnDelete();

            $table->foreignId('stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            // Status: draft, posted, cancelled
            $table->string('status', 20)->default('draft');

            $table->string('supplier_delivery_note', 100)->nullable();
            $table->timestamp('received_at')->nullable();

            $table->foreignId('received_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['supplier_id', 'status']);
            $table->index(['stock_location_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_receipts');
    }
};
