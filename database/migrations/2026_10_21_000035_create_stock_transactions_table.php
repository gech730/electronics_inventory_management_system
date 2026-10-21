<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();

            $table->string('transaction_number', 50)->unique();

            // Type: opening_balance, purchase_receipt, sale_issue, customer_return, supplier_return, adjustment_in, adjustment_out, transfer_out, transfer_in
            $table->string('transaction_type', 40);

            // Status: draft, posted, reversed
            $table->string('status', 20)->default('draft');

            // Polymorphic source document (GoodsReceipt, Sale, SaleReturn, StockTransfer, StockAdjustment)
            $table->nullableMorphs('source');

            $table->timestamp('occurred_at')->useCurrent();

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('posted_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('posted_at')->nullable();

            // For immutable audit trail reversals
            $table->foreignId('reversal_of_transaction_id')
                ->nullable()
                ->constrained('stock_transactions')
                ->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['transaction_type', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};
