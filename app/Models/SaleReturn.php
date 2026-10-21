<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    protected $fillable = [
        'return_number',
        'sale_id',
        'customer_id',
        'status',
        'reason',
        'requested_at',
        'received_at',
        'processed_by',
        'refund_total',
        'restock_to_location_id',
    ];

    protected $casts = [
        'refund_total' => 'decimal:2',
        'requested_at' => 'datetime',
        'received_at'  => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_REQUESTED = 'requested';
    const STATUS_APPROVED  = 'approved';
    const STATUS_REJECTED  = 'rejected';
    const STATUS_RECEIVED  = 'received';
    const STATUS_REFUNDED  = 'refunded';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    public static array $statuses = [
        self::STATUS_REQUESTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_RECEIVED,
        self::STATUS_REFUNDED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated original sale / invoice */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** Customer who requested the return */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Staff member who processed the return */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /** Destination location for restocked goods */
    public function restockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'restock_to_location_id');
    }

    /** Items included in this return */
    public function items(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }

    /** Refunds issued for this return */
    public function refunds(): HasMany
    {
        return $this->hasMany(SaleRefund::class);
    }
}
