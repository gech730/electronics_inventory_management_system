<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id',
        'product_variant_id',
        'quantity_ordered',
        'quantity_received',
        'unit_cost',
        'discount_amount',
        'tax_amount',
        'line_total',
    ];

    protected $casts = [
        'quantity_ordered'  => 'decimal:3',
        'quantity_received' => 'decimal:3',
        'unit_cost'         => 'decimal:2',
        'discount_amount'   => 'decimal:2',
        'tax_amount'        => 'decimal:2',
        'line_total'        => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent purchase order */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /** Product variant being ordered */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /** Goods receipt items linked to this PO line */
    public function goodsReceiptItems(): HasMany
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }
}
