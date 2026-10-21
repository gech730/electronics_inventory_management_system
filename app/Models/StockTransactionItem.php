<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransactionItem extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'stock_transaction_id',
        'stock_location_id',
        'product_variant_id',
        'quantity_delta',
        'unit_cost',
        'notes',
    ];

    protected $casts = [
        'quantity_delta' => 'decimal:3',
        'unit_cost'      => 'decimal:2',
        'created_at'     => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent stock transaction */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(StockTransaction::class, 'stock_transaction_id');
    }

    /** Location affected by this stock delta */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** Product variant affected */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
