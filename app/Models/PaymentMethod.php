<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    protected $fillable = [
        'code',
        'name',
        'method_type',
        'provider_name',
        'requires_reference',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'requires_reference' => 'boolean',
        'is_active'          => 'boolean',
        'sort_order'         => 'integer',
    ];

    // ── Method Type Constants ──────────────────────────────────
    const TYPE_CASH          = 'cash';
    const TYPE_BANK_TRANSFER = 'bank_transfer';
    const TYPE_MOBILE_MONEY  = 'mobile_money';
    const TYPE_CARD          = 'card';
    const TYPE_CHEQUE        = 'cheque';
    const TYPE_OTHER         = 'other';

    public static array $types = [
        self::TYPE_CASH,
        self::TYPE_BANK_TRANSFER,
        self::TYPE_MOBILE_MONEY,
        self::TYPE_CARD,
        self::TYPE_CHEQUE,
        self::TYPE_OTHER,
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Payments received through this payment method */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** Customer refunds issued via this payment method */
    public function refunds(): HasMany
    {
        return $this->hasMany(SaleRefund::class);
    }

    /** Outbound supplier payments sent via this method */
    public function supplierPayments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }
}
