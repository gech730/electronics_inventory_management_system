<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TaxRate extends Model
{
    protected $fillable = [
        'code',
        'name',
        'rate_percent',
        'is_inclusive',
        'is_active',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'rate_percent'   => 'decimal:4',
        'is_inclusive'   => 'boolean',
        'is_active'      => 'boolean',
        'effective_from' => 'date',
        'effective_to'   => 'date',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Product variants that this tax rate applies to */
    public function variants(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductVariant::class,
            'product_tax_rates',
            'tax_rate_id',
            'product_variant_id'
        );
    }
}
