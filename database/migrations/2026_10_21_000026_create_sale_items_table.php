<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')
                ->constrained('sales')
                ->cascadeOnDelete();

            $table->foreignId('order_item_id')
                ->nullable()
                ->constrained('order_items')
                ->nullOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            $table->string('product_name_snapshot', 180);
            $table->string('sku_snapshot', 80);

            $table->decimal('quantity', 14, 3);
            $table->decimal('unit_price', 14, 2);
            $table->decimal('discount_amount', 14, 2)->default(0.00);
            $table->decimal('tax_rate_percent', 7, 4)->default(0.0000);
            $table->decimal('tax_amount', 14, 2)->default(0.00);
            $table->decimal('line_total', 14, 2);

            $table->timestamps();

            $table->index(['sale_id', 'product_variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
