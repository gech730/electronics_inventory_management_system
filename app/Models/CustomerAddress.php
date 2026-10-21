<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    protected $fillable = [
        'customer_id',
        'label',
        'address_type',
        'recipient_name',
        'phone',
        'country_code',
        'region',
        'city',
        'sub_city',
        'woreda',
        'address_line',
        'landmark',
        'postal_code',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    // ── Address Type Constants ─────────────────────────────────
    const TYPE_BILLING  = 'billing';
    const TYPE_SHIPPING = 'shipping';
    const TYPE_BOTH     = 'both';

    public static array $types = [
        self::TYPE_BILLING,
        self::TYPE_SHIPPING,
        self::TYPE_BOTH,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** The customer who owns this address */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
