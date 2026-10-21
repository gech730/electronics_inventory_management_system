<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pos_register_id')
                ->constrained('pos_registers')
                ->restrictOnDelete();

            $table->foreignId('opened_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('closed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Status: open, closed, reconciled
            $table->string('status', 20)->default('open');

            $table->decimal('opening_cash', 14, 2)->default(0.00);
            $table->decimal('counted_cash', 14, 2)->nullable();
            $table->decimal('expected_cash', 14, 2)->nullable();
            $table->decimal('variance_amount', 14, 2)->nullable();

            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            // Indexes for fast lookup of active shifts
            $table->index(['pos_register_id', 'status']);
            $table->index(['opened_by', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_shifts');
    }
};
