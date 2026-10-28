<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\StockBalance;
use App\Models\StockReservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * Display a paginated listing of orders with multi-channel filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with([
                'customer:id,customer_code,display_name,phone,email',
                'store:id,code,name',
                'stockLocation:id,code,name',
                'items:id,order_id,product_variant_id,product_name_snapshot,sku_snapshot,quantity_ordered,unit_price,line_total',
            ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('fulfillment_type')) {
            $query->where('fulfillment_type', $request->fulfillment_type);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('display_name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        $orders = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($orders);
    }

    /**
     * Display the specified order with full domain relations.
     */
    public function show(Order $order): JsonResponse
    {
        $order->load([
            'customer.addresses',
            'store',
            'stockLocation',
            'posRegister',
            'cashierShift',
            'createdBy:id,name,email',
            'billingAddress',
            'shippingAddress',
            'items.productVariant.product:id,name,sku,category_id,brand_id',
            'shipments.items',
            'sales:id,sale_number,total_amount,created_at',
        ]);

        return response()->json($order);
    }

    /**
     * Store a newly created multi-channel order in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_number'        => ['nullable', 'string', 'max:50', 'unique:orders,order_number'],
            'source'              => ['required', 'string', 'in:online,pos,backoffice'],
            'status'              => ['nullable', 'string', 'in:draft,pending_payment,placed,confirmed,processing,ready_for_pickup,shipped,completed,cancelled,rejected'],
            'fulfillment_type'    => ['required', 'string', 'in:counter,pickup,delivery'],
            'customer_id'         => ['nullable', 'exists:customers,id'],
            'store_id'            => ['nullable', 'exists:stores,id'],
            'stock_location_id'   => ['nullable', 'exists:stock_locations,id'],
            'pos_register_id'     => ['nullable', 'exists:pos_registers,id'],
            'cashier_shift_id'    => ['nullable', 'exists:cashier_shifts,id'],
            'billing_address_id'  => ['nullable', 'exists:customer_addresses,id'],
            'shipping_address_id' => ['nullable', 'exists:customer_addresses,id'],
            'currency_code'       => ['nullable', 'string', 'size:3'],
            'shipping_fee'        => ['nullable', 'numeric', 'min:0'],
            'customer_notes'      => ['nullable', 'string'],
            'internal_notes'      => ['nullable', 'string'],

            'items'                       => ['required', 'array', 'min:1'],
            'items.*.product_variant_id'  => ['required', 'exists:product_variants,id'],
            'items.*.quantity_ordered'    => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price'          => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount'     => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate_percent'    => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $order = DB::transaction(function () use ($request, $validated) {
            $orderNumber = $validated['order_number'] ?? ('ORD-' . date('Ymd') . '-' . strtoupper(Str::random(6)));
            $status = $validated['status'] ?? Order::STATUS_PLACED;
            $shippingFee = (float) ($validated['shipping_fee'] ?? 0.00);

            // Snapshot addresses if available
            $billingSnapshot = null;
            if (!empty($validated['billing_address_id'])) {
                $bAddr = CustomerAddress::find($validated['billing_address_id']);
                $billingSnapshot = $bAddr ? json_encode($bAddr->toArray()) : null;
            }

            $shippingSnapshot = null;
            if (!empty($validated['shipping_address_id'])) {
                $sAddr = CustomerAddress::find($validated['shipping_address_id']);
                $shippingSnapshot = $sAddr ? json_encode($sAddr->toArray()) : null;
            }

            $order = Order::create([
                'order_number'              => $orderNumber,
                'source'                    => $validated['source'],
                'status'                    => $status,
                'fulfillment_type'          => $validated['fulfillment_type'],
                'customer_id'               => $validated['customer_id'] ?? null,
                'store_id'                  => $validated['store_id'] ?? null,
                'stock_location_id'         => $validated['stock_location_id'] ?? null,
                'pos_register_id'           => $validated['pos_register_id'] ?? null,
                'cashier_shift_id'          => $validated['cashier_shift_id'] ?? null,
                'created_by'                => $request->user()?->id,
                'billing_address_id'        => $validated['billing_address_id'] ?? null,
                'shipping_address_id'       => $validated['shipping_address_id'] ?? null,
                'billing_address_snapshot'  => $billingSnapshot,
                'shipping_address_snapshot' => $shippingSnapshot,
                'currency_code'             => $validated['currency_code'] ?? 'ETB',
                'subtotal'                  => 0.00,
                'discount_total'            => 0.00,
                'tax_total'                 => 0.00,
                'shipping_fee'              => $shippingFee,
                'grand_total'               => 0.00,
                'customer_notes'            => $validated['customer_notes'] ?? null,
                'internal_notes'            => $validated['internal_notes'] ?? null,
                'placed_at'                 => now(),
                'confirmed_at'              => in_array($status, [Order::STATUS_CONFIRMED, Order::STATUS_COMPLETED]) ? now() : null,
            ]);

            $subtotal = 0.00;
            $discountTotal = 0.00;
            $taxTotal = 0.00;

            foreach ($validated['items'] as $itemData) {
                $variant = ProductVariant::with('product')->lockForUpdate()->findOrFail($itemData['product_variant_id']);

                $unitPrice = isset($itemData['unit_price']) ? (float) $itemData['unit_price'] : (float) $variant->selling_price;
                $quantity = (float) $itemData['quantity_ordered'];
                $discount = (float) ($itemData['discount_amount'] ?? 0.00);
                $taxPercent = (float) ($itemData['tax_rate_percent'] ?? 0.0000);

                $lineSubtotal = round($quantity * $unitPrice, 2);
                $taxableAmount = max(0, $lineSubtotal - $discount);
                $taxAmount = round($taxableAmount * ($taxPercent / 100), 2);
                $lineTotal = round($taxableAmount + $taxAmount, 2);

                $subtotal += $lineSubtotal;
                $discountTotal += $discount;
                $taxTotal += $taxAmount;

                $orderItem = OrderItem::create([
                    'order_id'               => $order->id,
                    'product_variant_id'     => $variant->id,
                    'product_name_snapshot'  => $variant->variant_name ?: ($variant->product?->name ?? 'Product ' . $variant->id),
                    'sku_snapshot'           => $variant->sku ?: ($variant->product?->sku ?? 'SKU-' . $variant->id),
                    'quantity_ordered'       => $quantity,
                    'quantity_fulfilled'     => 0.000,
                    'quantity_cancelled'     => 0.000,
                    'unit_price'             => $unitPrice,
                    'discount_amount'        => $discount,
                    'tax_rate_percent'       => $taxPercent,
                    'tax_amount'             => $taxAmount,
                    'line_total'             => $lineTotal,
                ]);

                // Stock reservation handling if location specified and status is confirmed or processing
                if ($order->stock_location_id && in_array($status, [Order::STATUS_CONFIRMED, Order::STATUS_PROCESSING])) {
                    $stockBalance = StockBalance::where('stock_location_id', $order->stock_location_id)
                        ->where('product_variant_id', $variant->id)
                        ->lockForUpdate()
                        ->first();

                    if ($stockBalance) {
                        $stockBalance->increment('quantity_reserved', $quantity);

                        StockReservation::create([
                            'order_item_id'      => $orderItem->id,
                            'stock_location_id'  => $order->stock_location_id,
                            'product_variant_id' => $variant->id,
                            'quantity'           => $quantity,
                            'status'             => StockReservation::STATUS_ACTIVE,
                            'expires_at'         => now()->addDays(2),
                            'created_by'         => $request->user()?->id,
                        ]);
                    }
                }
            }

            $grandTotal = round($subtotal - $discountTotal + $taxTotal + $shippingFee, 2);

            $order->update([
                'subtotal'       => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total'      => $taxTotal,
                'grand_total'    => $grandTotal,
            ]);

            return $order;
        });

        return response()->json([
            'message' => 'Order created successfully.',
            'order'   => $order->load(['customer', 'store', 'items.productVariant']),
        ], 201);
    }

    /**
     * Update the order status, notes, or logistics attributes.
     */
    public function update(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status'         => ['sometimes', 'string', 'in:draft,pending_payment,placed,confirmed,processing,ready_for_pickup,shipped,completed,cancelled,rejected'],
            'customer_notes' => ['sometimes', 'nullable', 'string'],
            'internal_notes' => ['sometimes', 'nullable', 'string'],
            'shipping_fee'   => ['sometimes', 'numeric', 'min:0'],
        ]);

        $order = DB::transaction(function () use ($order, $validated) {
            $oldStatus = $order->status;
            $newStatus = $validated['status'] ?? $oldStatus;

            // Handle transition to confirmed: create stock reservations if not yet reserved
            if ($newStatus === Order::STATUS_CONFIRMED && $oldStatus !== Order::STATUS_CONFIRMED && $order->stock_location_id) {
                $order->confirmed_at = now();
                foreach ($order->items as $item) {
                    $hasActiveRes = StockReservation::where('order_item_id', $item->id)
                        ->where('status', StockReservation::STATUS_ACTIVE)
                        ->exists();

                    if (!$hasActiveRes) {
                        $balance = StockBalance::where('stock_location_id', $order->stock_location_id)
                            ->where('product_variant_id', $item->product_variant_id)
                            ->lockForUpdate()
                            ->first();

                        if ($balance) {
                            $balance->increment('quantity_reserved', $item->quantity_ordered);
                            StockReservation::create([
                                'order_item_id'      => $item->id,
                                'stock_location_id'  => $order->stock_location_id,
                                'product_variant_id' => $item->product_variant_id,
                                'quantity'           => $item->quantity_ordered,
                                'status'             => StockReservation::STATUS_ACTIVE,
                                'expires_at'         => now()->addDays(2),
                                'created_by'         => auth()->id(),
                            ]);
                        }
                    }
                }
            }

            // Handle transition to cancelled or rejected: release active stock reservations
            if (in_array($newStatus, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED]) && !in_array($oldStatus, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])) {
                $order->cancelled_at = now();
                $orderItems = $order->items()->pluck('id');
                $reservations = StockReservation::whereIn('order_item_id', $orderItems)
                    ->where('status', StockReservation::STATUS_ACTIVE)
                    ->get();

                foreach ($reservations as $res) {
                    $balance = StockBalance::where('stock_location_id', $res->stock_location_id)
                        ->where('product_variant_id', $res->product_variant_id)
                        ->lockForUpdate()
                        ->first();

                    if ($balance) {
                        $balance->decrement('quantity_reserved', min($balance->quantity_reserved, $res->quantity));
                    }

                    $res->update([
                        'status'      => StockReservation::STATUS_CANCELLED,
                        'released_at' => now(),
                    ]);
                }
            }

            // Handle transition to completed: consume reservations and deduct on-hand stock
            if ($newStatus === Order::STATUS_COMPLETED && $oldStatus !== Order::STATUS_COMPLETED) {
                $orderItems = $order->items;
                foreach ($orderItems as $item) {
                    $res = StockReservation::where('order_item_id', $item->id)
                        ->where('status', StockReservation::STATUS_ACTIVE)
                        ->first();

                    if ($res) {
                        $balance = StockBalance::where('stock_location_id', $res->stock_location_id)
                            ->where('product_variant_id', $res->product_variant_id)
                            ->lockForUpdate()
                            ->first();

                        if ($balance) {
                            $balance->decrement('quantity_reserved', min($balance->quantity_reserved, $res->quantity));
                            $balance->decrement('quantity_on_hand', min($balance->quantity_on_hand, $res->quantity));
                        }

                        // Also decrement parent product quantity for catalog sync
                        $variant = ProductVariant::find($item->product_variant_id);
                        if ($variant && $variant->product_id) {
                            $variant->product()->decrement('quantity', min($variant->product->quantity, (int) $res->quantity));
                        }

                        $res->update([
                            'status'      => StockReservation::STATUS_CONSUMED,
                            'consumed_at' => now(),
                        ]);
                    }
                }
            }

            $order->update($validated);

            return $order;
        });

        return response()->json([
            'message' => 'Order updated successfully.',
            'order'   => $order->fresh(['items', 'customer', 'store', 'shipments']),
        ]);
    }

    /**
     * Remove the specified order from storage with status guards.
     */
    public function destroy(Order $order): JsonResponse
    {
        if (!in_array($order->status, [Order::STATUS_DRAFT, Order::STATUS_CANCELLED, Order::STATUS_REJECTED])) {
            return response()->json([
                'message' => "Cannot delete an order with status '{$order->status}'. Only draft or cancelled orders can be purged.",
            ], 409);
        }

        DB::transaction(function () use ($order) {
            // Cancel any remaining reservations
            $orderItems = $order->items()->pluck('id');
            $reservations = StockReservation::whereIn('order_item_id', $orderItems)
                ->where('status', StockReservation::STATUS_ACTIVE)
                ->get();

            foreach ($reservations as $res) {
                $balance = StockBalance::where('stock_location_id', $res->stock_location_id)
                    ->where('product_variant_id', $res->product_variant_id)
                    ->lockForUpdate()
                    ->first();

                if ($balance) {
                    $balance->decrement('quantity_reserved', min($balance->quantity_reserved, $res->quantity));
                }

                $res->update([
                    'status'      => StockReservation::STATUS_CANCELLED,
                    'released_at' => now(),
                ]);
            }

            $order->delete();
        });

        return response()->json([
            'message' => 'Order deleted successfully.',
        ]);
    }
}
