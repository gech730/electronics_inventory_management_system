<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'variant_name',
        'attributes',
        'cost_price',
        'selling_price',
        'wholesale_price',
        'minimum_selling_price',
        'weight',
        'is_active',
    ];

    protected $casts = [
        'attributes'            => 'array',  // JSON decoded automatically
        'cost_price'            => 'decimal:2',
        'selling_price'         => 'decimal:2',
        'wholesale_price'       => 'decimal:2',
        'minimum_selling_price' => 'decimal:2',
        'weight'                => 'decimal:3',
        'is_active'             => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The parent product this variant belongs to */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
