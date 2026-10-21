<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoodsReceipt extends Model
{
    protected $fillable = [
        'receipt_number',
        'purchase_order_id',
        'supplier_id',
        'stock_location_id',
        'status',
        'supplier_delivery_note',
        'received_at',
        'received_by',
        'notes',
    ];

    protected $casts = [
        'received_at' => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_DRAFT     = 'draft';
    const STATUS_POSTED    = 'posted';
    const STATUS_CANCELLED = 'cancelled';

    public static array $statuses = [
        self::STATUS_DRAFT,
        self::STATUS_POSTED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated purchase order (optional) */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /** Supplier providing the received goods */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** The warehouse/stock location receiving the stock */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** Staff member who received the goods */
    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /** Received line items */
    public function items(): HasMany
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }
}
