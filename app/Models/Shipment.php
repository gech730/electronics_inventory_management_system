<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    protected $fillable = [
        'shipment_number',
        'order_id',
        'status',
        'shipping_provider',
        'tracking_number',
        'recipient_name',
        'recipient_phone',
        'delivery_address_snapshot',
        'shipped_at',
        'delivered_at',
        'handled_by',
        'notes',
    ];

    protected $casts = [
        'shipped_at'   => 'datetime',
        'delivered_at' => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_PENDING   = 'pending';
    const STATUS_PACKED    = 'packed';
    const STATUS_SHIPPED   = 'shipped';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_FAILED    = 'failed';
    const STATUS_CANCELLED = 'cancelled';

    public static array $statuses = [
        self::STATUS_PENDING,
        self::STATUS_PACKED,
        self::STATUS_SHIPPED,
        self::STATUS_DELIVERED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated order */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Staff member handling the dispatch */
    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /** Shipped items in this shipment package */
    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }
}
