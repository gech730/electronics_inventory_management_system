<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'brand_id',
        'base_unit_id',
        'product_code',
        'name',
        'slug',
        'description',
        'status',
        'track_inventory',
        'is_sellable',
        'created_by',
        // Legacy fields (still present in products table until migrated to variants)
        'sku',
        'brand',
        'model_number',
        'cost_price',
        'selling_price',
        'quantity',
        'minimum_stock',
    ];

    protected $casts = [
        'track_inventory' => 'boolean',
        'is_sellable'     => 'boolean',
        'cost_price'      => 'decimal:2',
        'selling_price'   => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    /** All SKU-level variants of this product */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /** The single default variant (simple products) */
    public function defaultVariant(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('variant_name', 'Default');
    }

    /** Staff member who created this product */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Product gallery images */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /** Primary image for thumbnail / display */
    public function primaryImage(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }
}