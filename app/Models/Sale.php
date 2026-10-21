<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'sale_number',
        'order_id',
        'customer_id',
        'store_id',
        'stock_location_id',
        'cashier_shift_id',
        'cashier_id',
        'status',
        'payment_status',
        'currency_code',
        'subtotal',
        'discount_total',
        'tax_total',
        'shipping_fee',
        'grand_total',
        'credit_terms_days',
        'due_date',
        'issued_at',
        'voided_at',
        'notes',
        // Legacy fields
        'user_id',
        'total_amount',
    ];

    protected $casts = [
        'subtotal'       => 'decimal:2',
        'discount_total' => 'decimal:2',
        'tax_total'      => 'decimal:2',
        'shipping_fee'   => 'decimal:2',
        'grand_total'    => 'decimal:2',
        'due_date'       => 'date',
        'issued_at'      => 'datetime',
        'voided_at'      => 'datetime',
    ];

    // ── Status Constants ───────────────────────────────────────
    const STATUS_POSTED             = 'posted';
    const STATUS_VOIDED             = 'voided';
    const STATUS_PARTIALLY_RETURNED = 'partially_returned';
    const STATUS_RETURNED           = 'returned';

    // ── Payment Status Constants ───────────────────────────────
    const PAYMENT_UNPAID             = 'unpaid';
    const PAYMENT_PARTIALLY_PAID     = 'partially_paid';
    const PAYMENT_PAID               = 'paid';
    const PAYMENT_OVERPAID           = 'overpaid';
    const PAYMENT_PARTIALLY_REFUNDED = 'partially_refunded';
    const PAYMENT_REFUNDED           = 'refunded';

    // ── Relationships ──────────────────────────────────────────

    /** Originating order */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Customer being billed */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Store where the sale was executed */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** Stock location from which inventory was issued */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** Cashier shift during which the sale was recorded */
    public function cashierShift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class);
    }

    /** Cashier who finalized this invoice */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /** Invoiced line items */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /** Payment allocations applied against this invoice */
    public function paymentAllocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    /** Customer returns initiated for this sale */
    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }
}