<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPayment extends Model
{
    protected $fillable = [
        'supplier_id',
        'purchase_order_id',
        'payment_method_id',
        'payment_number',
        'amount',
        'currency_code',
        'status',
        'transaction_reference',
        'paid_at',
        'recorded_by',
        'notes',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
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

    /** Supplier being paid */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** Associated purchase order (if tied to one) */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /** Payment method used */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /** Staff member who recorded the payment */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
