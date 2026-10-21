<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentItem extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'shipment_id',
        'order_item_id',
        'quantity_shipped',
    ];

    protected $casts = [
        'quantity_shipped' => 'decimal:3',
        'created_at'       => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent shipment package */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /** Order line item that this shipment fulfills */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
