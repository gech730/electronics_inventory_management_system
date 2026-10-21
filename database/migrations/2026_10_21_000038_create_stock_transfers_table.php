<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();

            $table->string('transfer_number', 50)->unique();

            $table->foreignId('from_stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            $table->foreignId('to_stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            // Status: draft, requested, approved, in_transit, partially_received, received, cancelled
            $table->string('status', 30)->default('draft');

            $table->foreignId('requested_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('shipped_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('received_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('received_at')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['from_stock_location_id', 'status']);
            $table->index(['to_stock_location_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};
