<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnItem extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'sale_return_id',
        'sale_item_id',
        'product_variant_id',
        'quantity',
        'condition',
        'restock',
        'refund_amount',
    ];

    protected $casts = [
        'quantity'      => 'decimal:3',
        'restock'       => 'boolean',
        'refund_amount' => 'decimal:2',
        'created_at'    => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent return */
    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    /** Original sale item line being returned */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    /** Product variant being returned */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
