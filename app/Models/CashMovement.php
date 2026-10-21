<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashMovement extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'cashier_shift_id',
        'movement_type',
        'amount',
        'reason',
        'payment_id',
        'recorded_by',
        'occurred_at',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'occurred_at' => 'datetime',
        'created_at'  => 'datetime',
    ];

    // ── Movement Type Constants ────────────────────────────────
    const TYPE_CASH_IN            = 'cash_in';
    const TYPE_CASH_OUT           = 'cash_out';
    const TYPE_OPENING_FLOAT      = 'opening_float';
    const TYPE_CLOSING_ADJUSTMENT = 'closing_adjustment';

    public static array $types = [
        self::TYPE_CASH_IN,
        self::TYPE_CASH_OUT,
        self::TYPE_OPENING_FLOAT,
        self::TYPE_CLOSING_ADJUSTMENT,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The shift in which this cash movement happened */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class, 'cashier_shift_id');
    }

    /** The user who recorded this cash movement */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
