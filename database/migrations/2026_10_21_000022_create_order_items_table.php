<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')
                ->constrained('orders')
                ->cascadeOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            // Historical immutable snapshots
            $table->string('product_name_snapshot', 180);
            $table->string('sku_snapshot', 80);

            $table->decimal('quantity_ordered', 14, 3);
            $table->decimal('quantity_fulfilled', 14, 3)->default(0.000);
            $table->decimal('quantity_cancelled', 14, 3)->default(0.000);

            $table->decimal('unit_price', 14, 2);
            $table->decimal('discount_amount', 14, 2)->default(0.00);
            $table->decimal('tax_rate_percent', 7, 4)->default(0.0000);
            $table->decimal('tax_amount', 14, 2)->default(0.00);
            $table->decimal('line_total', 14, 2);

            $table->timestamps();

            $table->index(['order_id', 'product_variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
