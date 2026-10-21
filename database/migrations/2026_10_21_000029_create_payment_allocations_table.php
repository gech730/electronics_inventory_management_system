<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payment_id')
                ->constrained('payments')
                ->cascadeOnDelete();

            $table->foreignId('sale_id')
                ->constrained('sales')
                ->cascadeOnDelete();

            $table->decimal('allocated_amount', 14, 2);
            $table->timestamp('allocated_at')->useCurrent();

            $table->foreignId('allocated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('created_at')->useCurrent();

            $table->unique(['payment_id', 'sale_id']);
            $table->index(['sale_id', 'allocated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
    }
};
