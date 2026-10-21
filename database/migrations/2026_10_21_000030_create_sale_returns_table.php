<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();

            $table->string('return_number', 50)->unique();

            $table->foreignId('sale_id')
                ->constrained('sales')
                ->cascadeOnDelete();

            $table->foreignId('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();

            // Status: requested, approved, rejected, received, refunded, completed, cancelled
            $table->string('status', 30)->default('requested');

            $table->text('reason')->nullable();

            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('received_at')->nullable();

            $table->foreignId('processed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->decimal('refund_total', 14, 2)->default(0.00);

            // Optional warehouse/location where returned items are restocked
            $table->foreignId('restock_to_location_id')
                ->nullable()
                ->constrained('stock_locations')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['sale_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_returns');
    }
};
