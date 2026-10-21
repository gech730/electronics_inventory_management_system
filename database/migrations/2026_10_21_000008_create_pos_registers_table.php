<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_registers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('store_id')
                ->constrained('stores')
                ->cascadeOnDelete();

            // Code must be unique within the same store (e.g. "REG-01")
            $table->string('code', 30);

            $table->string('name', 100);

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // A register code is unique per store
            $table->unique(['store_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_registers');
    }
};
