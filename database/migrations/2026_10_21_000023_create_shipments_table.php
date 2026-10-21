<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();

            $table->string('shipment_number', 50)->unique();

            $table->foreignId('order_id')
                ->constrained('orders')
                ->cascadeOnDelete();

            // Status: pending, packed, shipped, delivered, failed, cancelled
            $table->string('status', 20)->default('pending');

            $table->string('shipping_provider', 100)->nullable();
            $table->string('tracking_number', 150)->nullable();

            $table->string('recipient_name', 180)->nullable();
            $table->string('recipient_phone', 30)->nullable();
            $table->text('delivery_address_snapshot')->nullable();

            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->foreignId('handled_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
