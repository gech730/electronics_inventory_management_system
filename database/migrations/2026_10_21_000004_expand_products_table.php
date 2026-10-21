<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Replace the 'brand' string column with a proper brand_id FK
            // We keep the old 'brand' column for now and drop it after data migration
            $table->foreignId('brand_id')
                ->nullable()
                ->after('category_id')
                ->constrained('brands')
                ->nullOnDelete();

            // Unit of measure (e.g. piece, kg, box)
            $table->foreignId('base_unit_id')
                ->nullable()
                ->after('brand_id')
                ->constrained('units')
                ->nullOnDelete();

            // Unique product code (replaces old 'sku' which moves to variants)
            $table->string('product_code', 50)->nullable()->unique()->after('base_unit_id');

            // SEO-friendly slug
            $table->string('slug', 200)->nullable()->unique()->after('name');

            // Lifecycle status: draft | active | inactive | archived
            $table->string('status', 20)->default('active')->after('slug');

            // Inventory & sales flags
            $table->boolean('track_inventory')->default(true)->after('status');
            $table->boolean('is_sellable')->default(true)->after('track_inventory');

            // Who created this product record
            $table->foreignId('created_by')
                ->nullable()
                ->after('is_sellable')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
            $table->dropForeign(['base_unit_id']);
            $table->dropForeign(['created_by']);
            $table->dropColumn([
                'brand_id', 'base_unit_id', 'product_code',
                'slug', 'status', 'track_inventory', 'is_sellable', 'created_by',
            ]);
        });
    }
};
