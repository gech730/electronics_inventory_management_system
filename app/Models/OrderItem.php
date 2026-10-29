<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_variant_id',
        'product_name_snapshot',
        'sku_snapshot',
        'quantity_ordered',
        'quantity_fulfilled',
        'quantity_cancelled',
        'unit_price',
        'discount_amount',
        'tax_rate_percent',
        'tax_amount',
        'line_total',
    ];

    protected $casts = [
        'quantity_ordered'   => 'decimal:3',
        'quantity_fulfilled' => 'decimal:3',
        'quantity_cancelled' => 'decimal:3',
        'unit_price'         => 'decimal:2',
        'discount_amount'    => 'decimal:2',
        'tax_rate_percent'   => 'decimal:4',
        'tax_amount'         => 'decimal:2',
        'line_total'         => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent order */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Product variant */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /** Alias for productVariant */
    public function variant(): BelongsTo
    {
        return $this->productVariant();
    }

    /** Direct product access via variant */
    public function product(): HasOneThrough
    {
        return $this->hasOneThrough(Product::class, ProductVariant::class, 'id', 'id', 'product_variant_id', 'product_id');
    }

    /** Items shipped for this order line */
    public function shipmentItems(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    /** Invoiced sale lines for this order line */
    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
