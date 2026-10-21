<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('customer_id')
                ->constrained('customers')
                ->cascadeOnDelete();

            $table->string('label', 60)->nullable(); // e.g., "Home", "Office", "Main Branch"
            
            // Address type: billing, shipping, both
            $table->string('address_type', 20)->default('both');

            $table->string('recipient_name', 180)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('country_code', 2)->default('ET');
            $table->string('region', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('sub_city', 100)->nullable();
            $table->string('woreda', 100)->nullable();
            $table->string('address_line', 255)->nullable();
            $table->string('landmark', 255)->nullable();
            $table->string('postal_code', 30)->nullable();

            $table->boolean('is_default')->default(false);

            $table->timestamps();

            $table->index(['customer_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
