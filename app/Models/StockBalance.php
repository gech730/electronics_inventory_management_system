<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBalance extends Model
{
    protected $fillable = [
        'stock_location_id',
        'product_variant_id',
        'quantity_on_hand',
        'quantity_reserved',
        'reorder_level',
    ];

    protected $casts = [
        'quantity_on_hand'  => 'decimal:3',
        'quantity_reserved' => 'decimal:3',
        'reorder_level'     => 'decimal:3',
    ];

    // ── Accessors ──────────────────────────────────────────────

    /** Net available stock that can be sold or reserved */
    public function getQuantityAvailableAttribute(): float
    {
        return (float) ($this->quantity_on_hand - $this->quantity_reserved);
    }

    // ── Relationships ──────────────────────────────────────────

    /** The warehouse or shop floor location */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** The product variant */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
