<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->string('payment_number', 50)->unique();

            // Nullable for anonymous/walk-in POS customer payments
            $table->foreignId('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();

            $table->foreignId('payment_method_id')
                ->constrained('payment_methods')
                ->restrictOnDelete();

            $table->decimal('amount', 14, 2);
            $table->string('currency_code', 3)->default('ETB');

            // Status: pending, succeeded, failed, cancelled, reversed
            $table->string('status', 30)->default('pending');

            $table->string('transaction_reference', 150)->nullable();
            $table->string('provider_transaction_id', 180)->nullable();

            // Idempotency key to safely retry requests/callbacks without duplicate charge
            $table->string('idempotency_key', 100)->nullable()->unique();

            $table->timestamp('received_at')->nullable();

            $table->foreignId('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['customer_id', 'received_at']);
            $table->index(['status', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
