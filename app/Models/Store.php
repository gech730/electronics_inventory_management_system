<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    protected $fillable = [
        'code',
        'name',
        'phone',
        'email',
        'address',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Stock locations that belong to this store */
    public function stockLocations(): HasMany
    {
        return $this->hasMany(StockLocation::class);
    }

    /** POS registers in this store */
    public function posRegisters(): HasMany
    {
        return $this->hasMany(PosRegister::class);
    }
}
