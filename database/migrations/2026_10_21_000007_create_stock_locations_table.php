<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_locations', function (Blueprint $table) {
            $table->id();

            // A location belongs to a store (nullable for system-wide locations)
            $table->foreignId('store_id')
                ->nullable()
                ->constrained('stores')
                ->nullOnDelete();

            // Unique short code, e.g. "WH-MAIN", "SHOP-FLOOR-1"
            $table->string('code', 30)->unique();

            $table->string('name', 120);

            // Type of location: warehouse | shop_floor | returns | transit | damaged
            $table->string('location_type', 30);

            // Whether stock here can be sold directly from (true for shop floor, false for warehouse)
            $table->boolean('is_sellable')->default(false);

            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_locations');
    }
};
