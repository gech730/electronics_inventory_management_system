<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'payment_number',
        'customer_id',
        'payment_method_id',
        'amount',
        'currency_code',
        'status',
        'transaction_reference',
        'provider_transaction_id',
        'idempotency_key',
        'received_at',
        'recorded_by',
        'notes',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'received_at' => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_PENDING   = 'pending';
    const STATUS_SUCCEEDED = 'succeeded';
    const STATUS_FAILED    = 'failed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REVERSED  = 'reversed';

    public static array $statuses = [
        self::STATUS_PENDING,
        self::STATUS_SUCCEEDED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
        self::STATUS_REVERSED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Customer who made this payment */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Payment method used (cash, telebirr, card, etc.) */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /** Staff member who recorded the payment */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /** Invoices/sales this payment is allocated to */
    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }
}
