<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentAllocation extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'payment_id',
        'sale_id',
        'allocated_amount',
        'allocated_at',
        'allocated_by',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'allocated_at'     => 'datetime',
        'created_at'       => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    /** Associated payment */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** Associated sale / invoice */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** Staff member who allocated this payment */
    public function allocatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }
}
