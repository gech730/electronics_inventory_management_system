<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'purchase_order_number',
        'supplier_id',
        'store_id',
        'destination_stock_location_id',
        'status',
        'currency_code',
        'ordered_at',
        'expected_at',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'created_by',
        'approved_by',
        'notes',
    ];

    protected $casts = [
        'subtotal'       => 'decimal:2',
        'discount_total' => 'decimal:2',
        'tax_total'      => 'decimal:2',
        'grand_total'    => 'decimal:2',
        'ordered_at'     => 'datetime',
        'expected_at'    => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_DRAFT              = 'draft';
    const STATUS_SUBMITTED          = 'submitted';
    const STATUS_APPROVED           = 'approved';
    const STATUS_PARTIALLY_RECEIVED = 'partially_received';
    const STATUS_RECEIVED           = 'received';
    const STATUS_CANCELLED          = 'cancelled';

    public static array $statuses = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_APPROVED,
        self::STATUS_PARTIALLY_RECEIVED,
        self::STATUS_RECEIVED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Supplier this PO was ordered from */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** Receiving store */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** Specific warehouse/stock location receiving the stock */
    public function destinationStockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'destination_stock_location_id');
    }

    /** Line items of this purchase order */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /** Goods receipts associated with this purchase order */
    public function goodsReceipts(): HasMany
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    /** Staff member who created this PO */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Staff member / manager who approved this PO */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
