<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockTransaction extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'transaction_number',
        'transaction_type',
        'status',
        'source_type',
        'source_id',
        'occurred_at',
        'created_by',
        'posted_by',
        'posted_at',
        'reversal_of_transaction_id',
        'notes',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'posted_at'   => 'datetime',
        'created_at'  => 'datetime',
    ];

    // ── Type Constants ─────────────────────────────────────────
    const TYPE_OPENING_BALANCE  = 'opening_balance';
    const TYPE_PURCHASE_RECEIPT = 'purchase_receipt';
    const TYPE_SALE_ISSUE       = 'sale_issue';
    const TYPE_CUSTOMER_RETURN  = 'customer_return';
    const TYPE_SUPPLIER_RETURN  = 'supplier_return';
    const TYPE_ADJUSTMENT_IN    = 'adjustment_in';
    const TYPE_ADJUSTMENT_OUT   = 'adjustment_out';
    const TYPE_TRANSFER_OUT     = 'transfer_out';
    const TYPE_TRANSFER_IN      = 'transfer_in';

    // ── Status Constants ───────────────────────────────────────
    const STATUS_DRAFT    = 'draft';
    const STATUS_POSTED   = 'posted';
    const STATUS_REVERSED = 'reversed';

    // ── Relationships ──────────────────────────────────────────

    /** Polymorphic source document (GoodsReceipt, Sale, SaleReturn, StockTransfer, etc.) */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    /** User who drafted the transaction */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** User who posted/approved the transaction to the ledger */
    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /** Prior transaction that this transaction reverses (if any) */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(StockTransaction::class, 'reversal_of_transaction_id');
    }

    /** Line items posting delta quantities */
    public function items(): HasMany
    {
        return $this->hasMany(StockTransactionItem::class);
    }
}
