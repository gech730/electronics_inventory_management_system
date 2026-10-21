<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashierShift extends Model
{
    protected $fillable = [
        'pos_register_id',
        'opened_by',
        'closed_by',
        'status',
        'opening_cash',
        'counted_cash',
        'expected_cash',
        'variance_amount',
        'opened_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'opening_cash'    => 'decimal:2',
        'counted_cash'    => 'decimal:2',
        'expected_cash'   => 'decimal:2',
        'variance_amount' => 'decimal:2',
        'opened_at'       => 'datetime',
        'closed_at'       => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_OPEN       = 'open';
    const STATUS_CLOSED     = 'closed';
    const STATUS_RECONCILED = 'reconciled';

    public static array $statuses = [
        self::STATUS_OPEN,
        self::STATUS_CLOSED,
        self::STATUS_RECONCILED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The POS register this shift was opened on */
    public function posRegister(): BelongsTo
    {
        return $this->belongsTo(PosRegister::class);
    }

    /** The user (cashier) who opened this shift */
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /** The user (supervisor/cashier) who closed this shift */
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /** Cash in / out movements during this shift */
    public function cashMovements(): HasMany
    {
        return $this->hasMany(CashMovement::class);
    }
}
