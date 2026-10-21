<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cashier_shift_id')
                ->constrained('cashier_shifts')
                ->cascadeOnDelete();

            // Movement type: cash_in, cash_out, opening_float, closing_adjustment
            $table->string('movement_type', 30);

            $table->decimal('amount', 14, 2);
            $table->string('reason', 255)->nullable();

            // Optional link to payment record (table created in Module 8)
            $table->unsignedBigInteger('payment_id')->nullable();

            $table->foreignId('recorded_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['cashier_shift_id', 'movement_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
