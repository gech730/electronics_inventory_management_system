<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'supplier_code',
        'name',
        'contact_person',
        'phone',
        'email',
        'tax_number',
        'address',
        'payment_terms_days',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'is_active'          => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Purchase orders placed with this supplier */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
