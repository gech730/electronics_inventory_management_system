<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();

            $table->string('payment_number', 50)->unique();

            $table->foreignId('supplier_id')
                ->constrained('suppliers')
                ->restrictOnDelete();

            // Nullable for general supplier account payments not tied to a specific PO
            $table->foreignId('purchase_order_id')
                ->nullable()
                ->constrained('purchase_orders')
                ->nullOnDelete();

            $table->foreignId('payment_method_id')
                ->constrained('payment_methods')
                ->restrictOnDelete();

            $table->decimal('amount', 14, 2);
            $table->string('currency_code', 3)->default('ETB');

            // Status: pending, succeeded, failed, cancelled, reversed
            $table->string('status', 30)->default('pending');

            $table->string('transaction_reference', 150)->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->foreignId('recorded_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['supplier_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
