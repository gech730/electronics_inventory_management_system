<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'source',
        'status',
        'fulfillment_type',
        'customer_id',
        'store_id',
        'stock_location_id',
        'pos_register_id',
        'cashier_shift_id',
        'created_by',
        'billing_address_id',
        'shipping_address_id',
        'billing_address_snapshot',
        'shipping_address_snapshot',
        'currency_code',
        'subtotal',
        'discount_total',
        'tax_total',
        'shipping_fee',
        'grand_total',
        'customer_notes',
        'internal_notes',
        'placed_at',
        'confirmed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'subtotal'       => 'decimal:2',
        'discount_total' => 'decimal:2',
        'tax_total'      => 'decimal:2',
        'shipping_fee'   => 'decimal:2',
        'grand_total'    => 'decimal:2',
        'placed_at'      => 'datetime',
        'confirmed_at'   => 'datetime',
        'cancelled_at'   => 'datetime',
    ];

    // ── Enums Constants ────────────────────────────────────────

    // Source
    const SOURCE_ONLINE     = 'online';
    const SOURCE_POS        = 'pos';
    const SOURCE_BACKOFFICE = 'backoffice';

    // Status
    const STATUS_DRAFT            = 'draft';
    const STATUS_PENDING_PAYMENT  = 'pending_payment';
    const STATUS_PLACED           = 'placed';
    const STATUS_CONFIRMED        = 'confirmed';
    const STATUS_PROCESSING       = 'processing';
    const STATUS_READY_FOR_PICKUP = 'ready_for_pickup';
    const STATUS_SHIPPED          = 'shipped';
    const STATUS_COMPLETED        = 'completed';
    const STATUS_CANCELLED        = 'cancelled';
    const STATUS_REJECTED         = 'rejected';

    // Fulfillment
    const FULFILLMENT_COUNTER  = 'counter';
    const FULFILLMENT_PICKUP   = 'pickup';
    const FULFILLMENT_DELIVERY = 'delivery';

    // ── Relationships ──────────────────────────────────────────

    /** Customer who placed the order */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Store fulfilling or taking the order */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** Stock location from which inventory is picked */
    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** POS register if placed at a counter terminal */
    public function posRegister(): BelongsTo
    {
        return $this->belongsTo(PosRegister::class);
    }

    /** Cashier shift during which this order was made */
    public function cashierShift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class);
    }

    /** Staff member/cashier who took the order */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Billing address */
    public function billingAddress(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class, 'billing_address_id');
    }

    /** Shipping address */
    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class, 'shipping_address_id');
    }

    /** Ordered items */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Shipments for this order (delivery orders) */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    /** Sales (invoices) generated for this order */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
