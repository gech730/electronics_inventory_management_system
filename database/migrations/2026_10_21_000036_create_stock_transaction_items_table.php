<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transaction_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('stock_transaction_id')
                ->constrained('stock_transactions')
                ->cascadeOnDelete();

            $table->foreignId('stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            // Positive = stock IN; Negative = stock OUT
            $table->decimal('quantity_delta', 14, 3);
            $table->decimal('unit_cost', 14, 2)->nullable();
            $table->text('notes')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['stock_transaction_id', 'product_variant_id'], 'st_items_tx_variant_idx');
            $table->index(['stock_location_id', 'product_variant_id'], 'st_items_loc_variant_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transaction_items');
    }
};
