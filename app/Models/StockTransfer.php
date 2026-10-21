<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransfer extends Model
{
    protected $fillable = [
        'transfer_number',
        'from_stock_location_id',
        'to_stock_location_id',
        'status',
        'requested_by',
        'approved_by',
        'shipped_by',
        'received_by',
        'requested_at',
        'shipped_at',
        'received_at',
        'notes',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'shipped_at'   => 'datetime',
        'received_at'  => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_DRAFT              = 'draft';
    const STATUS_REQUESTED          = 'requested';
    const STATUS_APPROVED           = 'approved';
    const STATUS_IN_TRANSIT         = 'in_transit';
    const STATUS_PARTIALLY_RECEIVED = 'partially_received';
    const STATUS_RECEIVED           = 'received';
    const STATUS_CANCELLED          = 'cancelled';

    public static array $statuses = [
        self::STATUS_DRAFT,
        self::STATUS_REQUESTED,
        self::STATUS_APPROVED,
        self::STATUS_IN_TRANSIT,
        self::STATUS_PARTIALLY_RECEIVED,
        self::STATUS_RECEIVED,
        self::STATUS_CANCELLED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Origin stock location */
    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'from_stock_location_id');
    }

    /** Destination stock location */
    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'to_stock_location_id');
    }

    /** Staff member requesting the transfer */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** Supervisor/manager approving the transfer */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** Staff member who dispatched the items */
    public function shippedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shipped_by');
    }

    /** Staff member who received the items */
    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /** Items being transferred */
    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }
}
