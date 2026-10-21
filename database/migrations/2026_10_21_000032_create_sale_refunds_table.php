<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_refunds', function (Blueprint $table) {
            $table->id();

            $table->string('refund_number', 50)->unique();

            $table->foreignId('sale_return_id')
                ->constrained('sale_returns')
                ->cascadeOnDelete();

            $table->foreignId('payment_method_id')
                ->constrained('payment_methods')
                ->restrictOnDelete();

            $table->decimal('amount', 14, 2);

            // Status: pending, succeeded, failed, cancelled
            $table->string('status', 30)->default('pending');

            $table->string('transaction_reference', 150)->nullable();
            $table->timestamp('refunded_at')->nullable();

            $table->foreignId('processed_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['sale_return_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_refunds');
    }
};
