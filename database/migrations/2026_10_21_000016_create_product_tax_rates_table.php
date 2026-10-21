<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_tax_rates', function (Blueprint $table) {
            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->cascadeOnDelete();

            $table->foreignId('tax_rate_id')
                ->constrained('tax_rates')
                ->cascadeOnDelete();

            $table->timestamp('created_at')->useCurrent();

            $table->primary(['product_variant_id', 'tax_rate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_tax_rates');
    }
};
