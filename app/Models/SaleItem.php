<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id',
        'order_item_id',
        'product_variant_id',
        'product_name_snapshot',
        'sku_snapshot',
        'quantity',
        'unit_price',
        'discount_amount',
        'tax_rate_percent',
        'tax_amount',
        'line_total',
    ];

    protected $casts = [
        'quantity'         => 'decimal:3',
        'unit_price'       => 'decimal:2',
        'discount_amount'  => 'decimal:2',
        'tax_rate_percent' => 'decimal:4',
        'tax_amount'       => 'decimal:2',
        'line_total'       => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent sale / invoice */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** Corresponding line in original order (if any) */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    /** Product variant invoiced */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
