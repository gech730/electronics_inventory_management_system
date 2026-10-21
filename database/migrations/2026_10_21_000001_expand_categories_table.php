<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Self-referencing parent for nested categories
            $table->foreignId('parent_id')
                ->nullable()
                ->after('id')
                ->constrained('categories')
                ->nullOnDelete();

            $table->string('code', 40)->nullable()->unique()->after('parent_id');
            $table->string('slug', 150)->nullable()->unique()->after('name');
            $table->integer('sort_order')->default(0)->after('slug');
            $table->boolean('is_active')->default(true)->after('sort_order');

            // Track who created the category
            $table->foreignId('created_by')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['parent_id', 'code', 'slug', 'sort_order', 'is_active', 'created_by']);
        });
    }
};
