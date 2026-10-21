<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosRegister extends Model
{
    protected $fillable = [
        'store_id',
        'code',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The store this register belongs to */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** Shifts conducted on this register */
    public function cashierShifts(): HasMany
    {
        return $this->hasMany(CashierShift::class);
    }
}
