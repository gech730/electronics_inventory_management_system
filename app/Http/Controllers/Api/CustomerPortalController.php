<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPortalController extends Controller
{
    /**
     * Get authenticated customer profile, saved addresses, and activity metrics.
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();

        // Retrieve customer record linked by user_id or email
        $customer = Customer::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->with(['addresses', 'defaultAddress'])
            ->first();

        // Get customer orders to compute stats
        $ordersQuery = Order::where(function ($q) use ($user, $customer) {
            $q->where('created_by', $user->id);
            if ($customer) {
                $q->orWhere('customer_id', $customer->id);
            }
        });

        $totalOrders = (clone $ordersQuery)->count();
        $totalSpent = (clone $ordersQuery)->sum('grand_total');
        
        $orderIds = (clone $ordersQuery)->pluck('id');
        $activeShipmentsCount = Shipment::whereIn('order_id', $orderIds)
            ->whereIn('status', [Shipment::STATUS_PENDING, Shipment::STATUS_PACKED, Shipment::STATUS_SHIPPED])
            ->count();

        // Determine VIP Tier based on lifetime expenditure
        $tier = 'Ngus Premier';
        $tierBadge = 'Standard';
        if ($totalSpent >= 100000) {
            $tier = 'Imperial Diamond VIP';
            $tierBadge = 'Diamond';
        } elseif ($totalSpent >= 35000) {
            $tier = 'Royal Gold VIP';
            $tierBadge = 'Gold';
        } elseif ($totalSpent >= 10000) {
            $tier = 'Silver Elite';
            $tierBadge = 'Silver';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
                'customer' => $customer,
                'metrics' => [
                    'total_orders'           => $totalOrders,
                    'total_spent'            => (float) $totalSpent,
                    'active_shipments_count' => $activeShipmentsCount,
                    'membership_tier'        => $tier,
                    'tier_badge'             => $tierBadge,
                ],
            ],
        ]);
    }

    /**
     * Get customer order history with items, shipments, and payment breakdown.
     */
    public function orders(Request $request): JsonResponse
    {
        $user = $request->user();

        $customer = Customer::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        $orders = Order::where(function ($q) use ($user, $customer) {
            $q->where('created_by', $user->id);
            if ($customer) {
                $q->orWhere('customer_id', $customer->id);
            }
        })
        ->with([
            'customer',
            'shippingAddress',
            'items.product.images',
            'items.variant',
            'shipments',
            'sales.payments.paymentMethod',
        ])
        ->latest('created_at')
        ->get();

        // Attach direct payments if found by order note/customer
        $enhancedOrders = $orders->map(function ($order) {
            $payment = Payment::where(function ($q) use ($order) {
                $q->where('notes', 'like', "%{$order->order_number}%");
                if ($order->customer_id) {
                    $q->orWhere('customer_id', $order->customer_id);
                }
            })
            ->with('paymentMethod')
            ->latest('received_at')
            ->first();

            $orderArray = $order->toArray();
            $orderArray['direct_payment'] = $payment;
            return $orderArray;
        });

        return response()->json([
            'success' => true,
            'data'    => $enhancedOrders,
        ]);
    }

    /**
     * Get all active and completed shipments for this customer.
     */
    public function shipments(Request $request): JsonResponse
    {
        $user = $request->user();

        $customer = Customer::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        $orderIds = Order::where(function ($q) use ($user, $customer) {
            $q->where('created_by', $user->id);
            if ($customer) {
                $q->orWhere('customer_id', $customer->id);
            }
        })->pluck('id');

        $shipments = Shipment::whereIn('order_id', $orderIds)
            ->with([
                'order.items.product.images',
                'items.orderItem.product',
            ])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $shipments,
        ]);
    }

    /**
     * Live shipment and order tracking lookup (Public & Authenticated).
     * Accepts: Tracking number (e.g. NGS-TRK-...), Shipment number, Order number, or Phone number.
     */
    public function track(string $reference): JsonResponse
    {
        $cleanRef = trim($reference);

        if (empty($cleanRef)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid tracking number or order number.',
            ], 422);
        }

        // 1. Search Shipment
        $shipment = Shipment::where('tracking_number', $cleanRef)
            ->orWhere('shipment_number', $cleanRef)
            ->orWhere('recipient_phone', $cleanRef)
            ->orWhereHas('order', function ($q) use ($cleanRef) {
                $q->where('order_number', $cleanRef);
            })
            ->with([
                'order.customer',
                'order.shippingAddress',
                'order.items.product.images',
                'order.items.variant',
                'items.orderItem.product',
            ])
            ->latest()
            ->first();

        if ($shipment) {
            $order = $shipment->order;

            // Formulate dynamic 4-stage tracking timeline
            $isPlaced = true;
            $isPacked = in_array($shipment->status, [Shipment::STATUS_PACKED, Shipment::STATUS_SHIPPED, Shipment::STATUS_DELIVERED]);
            $isShipped = in_array($shipment->status, [Shipment::STATUS_SHIPPED, Shipment::STATUS_DELIVERED]);
            $isDelivered = ($shipment->status === Shipment::STATUS_DELIVERED);

            $timeline = [
                [
                    'step'        => 1,
                    'title'       => 'Order Confirmed & Secured',
                    'description' => 'Payment authorized and items allocated in Ngus Central Vault.',
                    'timestamp'   => $order ? $order->created_at->format('M d, Y - h:i A') : $shipment->created_at->format('M d, Y - h:i A'),
                    'status'      => 'completed',
                    'icon'        => 'check-circle',
                ],
                [
                    'step'        => 2,
                    'title'       => 'Hardware Packaged & Quality Verified',
                    'description' => 'Fragile anti-static seal applied and serial numbers registered.',
                    'timestamp'   => $shipment->created_at->format('M d, Y - h:i A'),
                    'status'      => $isPacked ? 'completed' : 'processing',
                    'icon'        => 'package',
                ],
                [
                    'step'        => 3,
                    'title'       => 'Dispatched via ' . ($shipment->shipping_provider ?: 'Ngus Express Courier'),
                    'description' => 'En route with courier driver in Addis Ababa express transit corridor.',
                    'timestamp'   => $shipment->shipped_at ? $shipment->shipped_at->format('M d, Y - h:i A') : ($isShipped ? now()->format('M d, Y - h:i A') : 'Estimated Dispatch: Within 24 hrs'),
                    'status'      => $isShipped ? 'completed' : ($isPacked ? 'in_transit' : 'pending'),
                    'icon'        => 'truck',
                ],
                [
                    'step'        => 4,
                    'title'       => 'Out for Final Delivery & Customer Handover',
                    'description' => 'Arriving at destination address with identity verification code.',
                    'timestamp'   => $shipment->delivered_at ? $shipment->delivered_at->format('M d, Y - h:i A') : 'Pending Arrival',
                    'status'      => $isDelivered ? 'completed' : ($isShipped ? 'in_transit' : 'pending'),
                    'icon'        => 'home',
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'tracking_number'           => $shipment->tracking_number,
                    'shipment_number'           => $shipment->shipment_number,
                    'status'                    => $shipment->status,
                    'shipping_provider'         => $shipment->shipping_provider ?: 'Ngus Express Fleet',
                    'recipient_name'            => $shipment->recipient_name,
                    'recipient_phone'           => $shipment->recipient_phone,
                    'delivery_address_snapshot' => $shipment->delivery_address_snapshot,
                    'shipped_at'                => $shipment->shipped_at,
                    'delivered_at'              => $shipment->delivered_at,
                    'notes'                     => $shipment->notes,
                    'created_at'                => $shipment->created_at,
                    'order'                     => $order ? [
                        'id'               => $order->id,
                        'order_number'     => $order->order_number,
                        'status'           => $order->status,
                        'fulfillment_type' => $order->fulfillment_type,
                        'grand_total'      => $order->grand_total,
                        'created_at'       => $order->created_at,
                        'items_count'      => $order->items->count(),
                        'items'            => $order->items,
                    ] : null,
                    'timeline'                  => $timeline,
                ],
            ]);
        }

        // 2. If no shipment found, check if an Order matches
        $order = Order::where('order_number', $cleanRef)
            ->with(['items.product.images', 'shippingAddress', 'customer'])
            ->first();

        if ($order) {
            $timeline = [
                [
                    'step'        => 1,
                    'title'       => 'Order Confirmed',
                    'description' => 'Order verified and reserved in inventory.',
                    'timestamp'   => $order->created_at->format('M d, Y - h:i A'),
                    'status'      => 'completed',
                    'icon'        => 'check-circle',
                ],
                [
                    'step'        => 2,
                    'title'       => 'Order Processing & Vault Allocation',
                    'description' => 'Items prepared for ' . ($order->fulfillment_type === 'pickup' ? 'store pickup' : 'courier packing') . '.',
                    'timestamp'   => $order->confirmed_at ? $order->confirmed_at->format('M d, Y - h:i A') : now()->format('M d, Y - h:i A'),
                    'status'      => 'processing',
                    'icon'        => 'package',
                ],
                [
                    'step'        => 3,
                    'title'       => $order->fulfillment_type === 'pickup' ? 'Ready for Store Collection' : 'Preparing for Courier Dispatch',
                    'description' => $order->fulfillment_type === 'pickup' ? 'Present order code at counter.' : 'Courier assignment in progress.',
                    'timestamp'   => 'Scheduled',
                    'status'      => 'pending',
                    'icon'        => 'truck',
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'tracking_number'           => 'PENDING-DISPATCH',
                    'shipment_number'           => null,
                    'status'                    => $order->status,
                    'shipping_provider'         => $order->fulfillment_type === 'pickup' ? 'Self Collection (Bole Medhanialem Store)' : 'Ngus Express Courier',
                    'recipient_name'            => $order->customer?->display_name ?? 'Valued Customer',
                    'recipient_phone'           => $order->customer?->phone ?? 'Registered',
                    'delivery_address_snapshot' => $order->shippingAddress?->address_line_1 ?? 'Addis Ababa',
                    'order'                     => [
                        'id'               => $order->id,
                        'order_number'     => $order->order_number,
                        'status'           => $order->status,
                        'fulfillment_type' => $order->fulfillment_type,
                        'grand_total'      => $order->grand_total,
                        'created_at'       => $order->created_at,
                        'items_count'      => $order->items->count(),
                        'items'            => $order->items,
                    ],
                    'timeline'                  => $timeline,
                ],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'No order or shipment found matching reference "' . $cleanRef . '". Please verify your tracking number or order number.',
        ], 404);
    }
}
