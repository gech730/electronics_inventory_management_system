<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
             $table->foreignId('category_id')
            ->constrained()
            ->restrictOnDelete();

            $table->string('name');
            $table->string('sku')->unique();
            $table->string('brand')->nullable();
            $table->string('model_number')->nullable();

            $table->decimal('cost_price', 10, 2);
            $table->decimal('selling_price', 10, 2);

            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('minimum_stock')->default(5);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
