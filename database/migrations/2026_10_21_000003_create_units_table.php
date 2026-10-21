<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->string('abbreviation', 20)->unique();
            // Whether this unit allows fractional quantities (e.g. kg allows 1.5, pcs does not)
            $table->boolean('allows_decimal_quantity')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
