<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockReservation extends Model
{
    protected $fillable = [
        'order_item_id',
        'stock_location_id',
        'product_variant_id',
        'quantity',
        'status',
        'expires_at',
        'released_at',
        'consumed_at',
        'created_by',
    ];

    protected $casts = [
        'quantity'    => 'decimal:3',
        'expires_at'  => 'datetime',
        'released_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_ACTIVE    = 'active';
    const STATUS_RELEASED  = 'released';
    const STATUS_CONSUMED  = 'consumed';
    const STATUS_EXPIRED   = 'expired';
    const STATUS_CANCELLED = 'cancelled';

    public static array $statuses = [
        self::STATUS_ACTIVE,
        self::STATUS_RELEASED,
        self::STATUS_CONSUMED,
        self::STATUS_EXPIRED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated order item this stock is reserved for */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    /** Location where the reservation holds stock */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** Product variant reserved */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /** User who placed or created the reservation */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
