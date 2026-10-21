<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'product_id',
        'image_path',
        'alt_text',
        'sort_order',
        'is_primary',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_primary' => 'boolean',
        'created_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The product this image belongs to */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
