<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            // Stock Keeping Unit — globally unique across all variants
            $table->string('sku', 80)->unique();

            // Barcode (EAN-13, UPC, QR code, etc.) — optional, unique if set
            $table->string('barcode', 100)->nullable()->unique();

            // For simple products this is 'Default'; for variable products: 'Red / XL', etc.
            $table->string('variant_name', 120)->default('Default');

            // JSON blob for variant dimensions e.g. {"color":"Red","size":"XL"}
            $table->json('attributes')->nullable();

            // Pricing at variant level
            $table->decimal('cost_price', 14, 2)->default(0);
            $table->decimal('selling_price', 14, 2)->default(0);
            $table->decimal('wholesale_price', 14, 2)->nullable();
            $table->decimal('minimum_selling_price', 14, 2)->nullable();

            // Physical dimension
            $table->decimal('weight', 12, 3)->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
