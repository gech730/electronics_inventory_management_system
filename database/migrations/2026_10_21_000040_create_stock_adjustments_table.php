<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();

            $table->string('adjustment_number', 50)->unique();

            $table->foreignId('stock_location_id')
                ->constrained('stock_locations')
                ->restrictOnDelete();

            // Status: draft, submitted, approved, posted, rejected, cancelled
            $table->string('status', 30)->default('draft');

            $table->string('reason', 255);

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('posted_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('counted_at')->nullable();
            $table->timestamp('posted_at')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['stock_location_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
