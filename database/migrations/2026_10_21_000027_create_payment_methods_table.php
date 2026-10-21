<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();

            $table->string('code', 40)->unique();
            $table->string('name', 100);

            // Method type: cash, bank_transfer, mobile_money, card, cheque, other
            $table->string('method_type', 30);

            $table->string('provider_name', 100)->nullable(); // e.g. Telebirr, CBE, Dashen Bank
            $table->boolean('requires_reference')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
