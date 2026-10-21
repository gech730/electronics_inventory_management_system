<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();

            // Nullable for walk-in/POS customers who do not have an online user account
            $table->foreignId('user_id')
                ->nullable()
                ->unique()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('customer_code', 40)->unique();
            $table->string('customer_type', 30)->default('individual'); // individual, corporate
            $table->string('display_name', 180);
            $table->string('phone', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('tax_number', 80)->nullable();

            // Credit management
            $table->decimal('credit_limit', 14, 2)->default(0.00);
            $table->integer('default_credit_days')->default(0);

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->timestamps();

            // Index for quick search
            $table->index('phone');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
