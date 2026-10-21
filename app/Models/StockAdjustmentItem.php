<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustmentItem extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'stock_adjustment_id',
        'product_variant_id',
        'system_quantity',
        'counted_quantity',
        'difference_quantity',
        'unit_cost',
        'notes',
    ];

    protected $casts = [
        'system_quantity'     => 'decimal:3',
        'counted_quantity'    => 'decimal:3',
        'difference_quantity' => 'decimal:3',
        'unit_cost'           => 'decimal:2',
        'created_at'          => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent stock adjustment */
    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'stock_adjustment_id');
    }

    /** Product variant */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
