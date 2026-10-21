<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('stock_transfer_id')
                ->constrained('stock_transfers')
                ->cascadeOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            $table->decimal('quantity_requested', 14, 3);
            $table->decimal('quantity_shipped', 14, 3)->default(0.000);
            $table->decimal('quantity_received', 14, 3)->default(0.000);

            $table->timestamps();

            $table->index(['stock_transfer_id', 'product_variant_id'], 'sti_transfer_variant_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
    }
};
