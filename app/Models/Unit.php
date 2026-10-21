<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $fillable = [
        'name',
        'abbreviation',
        'allows_decimal_quantity',
    ];

    protected $casts = [
        'allows_decimal_quantity' => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Products that use this as their base unit */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'base_unit_id');
    }
}
