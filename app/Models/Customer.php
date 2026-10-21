<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    protected $fillable = [
        'user_id',
        'customer_code',
        'customer_type',
        'display_name',
        'phone',
        'email',
        'tax_number',
        'credit_limit',
        'default_credit_days',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'credit_limit'        => 'decimal:2',
        'default_credit_days' => 'integer',
        'is_active'           => 'boolean',
    ];

    // ── Customer Type Constants ────────────────────────────────
    const TYPE_INDIVIDUAL = 'individual';
    const TYPE_CORPORATE  = 'corporate';

    public static array $types = [
        self::TYPE_INDIVIDUAL,
        self::TYPE_CORPORATE,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated online user account (if any) */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** All saved addresses for this customer */
    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    /** Default address for this customer */
    public function defaultAddress(): HasOne
    {
        return $this->hasOne(CustomerAddress::class)->where('is_default', true);
    }
}
