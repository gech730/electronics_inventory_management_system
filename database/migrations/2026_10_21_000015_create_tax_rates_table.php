<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();

            $table->string('code', 40)->unique();
            $table->string('name', 120);

            // e.g. 15.0000 for 15% VAT, 2.0000 for 2% TOT
            $table->decimal('rate_percent', 7, 4);

            // True if the selling price already includes this tax
            $table->boolean('is_inclusive')->default(false);

            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
