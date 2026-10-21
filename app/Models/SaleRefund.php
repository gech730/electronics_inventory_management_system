<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleRefund extends Model
{
    protected $fillable = [
        'refund_number',
        'sale_return_id',
        'payment_method_id',
        'amount',
        'status',
        'transaction_reference',
        'refunded_at',
        'processed_by',
        'notes',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'refunded_at' => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_PENDING   = 'pending';
    const STATUS_SUCCEEDED = 'succeeded';
    const STATUS_FAILED    = 'failed';
    const STATUS_CANCELLED = 'cancelled';

    public static array $statuses = [
        self::STATUS_PENDING,
        self::STATUS_SUCCEEDED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated sale return */
    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    /** Payment method used to disburse the refund */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /** Staff member who processed the refund */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
