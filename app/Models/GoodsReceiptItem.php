<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptItem extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'goods_receipt_id',
        'purchase_order_item_id',
        'product_variant_id',
        'quantity_received',
        'unit_cost',
    ];

    protected $casts = [
        'quantity_received' => 'decimal:3',
        'unit_cost'         => 'decimal:2',
        'created_at'        => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Parent goods receipt */
    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    /** Corresponding purchase order line item (if tied to a PO) */
    public function purchaseOrderItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderItem::class);
    }

    /** Product variant received */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
