<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockLocation extends Model
{
    protected $fillable = [
        'store_id',
        'code',
        'name',
        'location_type',
        'is_sellable',
        'is_active',
    ];

    protected $casts = [
        'is_sellable' => 'boolean',
        'is_active'   => 'boolean',
    ];

    // ── Location Type Constants ────────────────────────────────
    const TYPE_WAREHOUSE  = 'warehouse';
    const TYPE_SHOP_FLOOR = 'shop_floor';
    const TYPE_RETURNS    = 'returns';
    const TYPE_TRANSIT    = 'transit';
    const TYPE_DAMAGED    = 'damaged';

    public static array $types = [
        self::TYPE_WAREHOUSE,
        self::TYPE_SHOP_FLOOR,
        self::TYPE_RETURNS,
        self::TYPE_TRANSIT,
        self::TYPE_DAMAGED,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The store this location belongs to */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
