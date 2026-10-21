<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_return_id')
                ->constrained('sale_returns')
                ->cascadeOnDelete();

            $table->foreignId('sale_item_id')
                ->constrained('sale_items')
                ->restrictOnDelete();

            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();

            $table->decimal('quantity', 14, 3);
            $table->string('condition', 50)->default('sellable'); // sellable, damaged, opened, defective
            $table->boolean('restock')->default(true);
            $table->decimal('refund_amount', 14, 2)->default(0.00);

            $table->timestamp('created_at')->useCurrent();

            $table->index(['sale_return_id', 'product_variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_items');
    }
};
