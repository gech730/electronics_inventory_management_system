<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods_receipt_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('goods_receipt_id')
                ->constrained('goods_receipts')
                ->cascadeOnDelete();

            // Nullable for standalone receipts not tied to a specific PO line
            $table->foreignId('purchase_order_item_id')
                ->nullable()
                ->constrained('purchase_order_items')
                ->nullOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            $table->decimal('quantity_received', 14, 3);
            $table->decimal('unit_cost', 14, 2);

            $table->timestamp('created_at')->useCurrent();

            $table->index(['goods_receipt_id', 'product_variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_receipt_items');
    }
};
