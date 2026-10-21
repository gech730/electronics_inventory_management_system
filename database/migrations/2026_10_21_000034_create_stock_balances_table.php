<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_balances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('stock_location_id')
                ->constrained('stock_locations')
                ->cascadeOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->cascadeOnDelete();

            $table->decimal('quantity_on_hand', 14, 3)->default(0.000);
            $table->decimal('quantity_reserved', 14, 3)->default(0.000);
            $table->decimal('reorder_level', 14, 3)->default(0.000);

            $table->timestamps();

            $table->unique(['stock_location_id', 'product_variant_id']);
            $table->index(['product_variant_id', 'stock_location_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_balances');
    }
};
