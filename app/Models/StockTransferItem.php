<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferItem extends Model
{
    protected $fillable = [
        'stock_transfer_id',
        'product_variant_id',
        'quantity_requested',
        'quantity_shipped',
        'quantity_received',
    ];

    protected $casts = [
        'quantity_requested' => 'decimal:3',
        'quantity_shipped'   => 'decimal:3',
        'quantity_received'  => 'decimal:3',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent transfer request */
    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'stock_transfer_id');
    }

    /** Product variant being moved */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
