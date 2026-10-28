<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shipment;
use App\Models\ShipmentItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ShipmentController extends Controller
{
    /**
     * Display a listing of shipments with optional filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Shipment::query()
            ->with([
                'order:id,order_number,status,customer_id',
                'handledBy:id,name,email',
                'items:id,shipment_id,order_item_id,quantity_shipped',
            ]);

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('shipping_provider')) {
            $query->where('shipping_provider', $request->shipping_provider);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('shipment_number', 'like', "%{$search}%")
                  ->orWhere('tracking_number', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%")
                  ->orWhere('recipient_phone', 'like', "%{$search}%");
            });
        }

        $shipments = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($shipments);
    }

    /**
     * Display the specified shipment details and line items.
     */
    public function show(Shipment $shipment): JsonResponse
    {
        $shipment->load([
            'order.customer:id,customer_code,display_name,phone,email',
            'order.items',
            'handledBy:id,name,email',
            'items.orderItem',
        ]);

        return response()->json($shipment);
    }

    /**
     * Store a newly created shipment package and fulfill order lines.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id'                  => ['required', 'exists:orders,id'],
            'shipment_number'           => ['nullable', 'string', 'max:50', 'unique:shipments,shipment_number'],
            'status'                    => ['nullable', 'string', 'in:pending,packed,shipped,delivered,failed,cancelled'],
            'shipping_provider'         => ['nullable', 'string', 'max:100'],
            'tracking_number'           => ['nullable', 'string', 'max:150'],
            'recipient_name'            => ['nullable', 'string', 'max:180'],
            'recipient_phone'           => ['nullable', 'string', 'max:30'],
            'delivery_address_snapshot' => ['nullable', 'string'],
            'notes'                     => ['nullable', 'string'],

            'items'                     => ['required', 'array', 'min:1'],
            'items.*.order_item_id'     => ['required', 'exists:order_items,id'],
            'items.*.quantity_shipped'  => ['required', 'numeric', 'min:0.001'],
        ]);

        $shipment = DB::transaction(function () use ($request, $validated) {
            $order = Order::with('items')->lockForUpdate()->findOrFail($validated['order_id']);

            if (in_array($order->status, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])) {
                throw ValidationException::withMessages([
                    'order_id' => ["Cannot create shipment for an order with status '{$order->status}'."],
                ]);
            }

            $shipmentNumber = $validated['shipment_number'] ?? ('SHP-' . date('Ymd') . '-' . strtoupper(Str::random(6)));
            $status = $validated['status'] ?? Shipment::STATUS_PENDING;

            // Resolve recipient info fallback from order or shipping address snapshot
            $recipientName = $validated['recipient_name'] ?? ($order->shippingAddress?->recipient_name ?? $order->customer?->display_name);
            $recipientPhone = $validated['recipient_phone'] ?? ($order->shippingAddress?->phone ?? $order->customer?->phone);
            $addressSnapshot = $validated['delivery_address_snapshot'] ?? $order->shipping_address_snapshot;

            $shipment = Shipment::create([
                'shipment_number'           => $shipmentNumber,
                'order_id'                  => $order->id,
                'status'                    => $status,
                'shipping_provider'         => $validated['shipping_provider'] ?? null,
                'tracking_number'           => $validated['tracking_number'] ?? null,
                'recipient_name'            => $recipientName,
                'recipient_phone'           => $recipientPhone,
                'delivery_address_snapshot' => $addressSnapshot,
                'shipped_at'                => ($status === Shipment::STATUS_SHIPPED) ? now() : null,
                'delivered_at'              => ($status === Shipment::STATUS_DELIVERED) ? now() : null,
                'handled_by'                => $request->user()?->id,
                'notes'                     => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                $orderItem = OrderItem::lockForUpdate()->findOrFail($itemData['order_item_id']);

                if ($orderItem->order_id !== $order->id) {
                    throw ValidationException::withMessages([
                        'items' => ["Order item #{$orderItem->id} does not belong to order #{$order->id}."],
                    ]);
                }

                $qtyToShip = (float) $itemData['quantity_shipped'];
                $remaining = (float) ($orderItem->quantity_ordered - $orderItem->quantity_fulfilled - $orderItem->quantity_cancelled);

                if ($qtyToShip > $remaining) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Cannot ship {$qtyToShip} units for '{$orderItem->product_name_snapshot}'. Remaining unfulfilled quantity: {$remaining}."
                        ],
                    ]);
                }

                ShipmentItem::create([
                    'shipment_id'      => $shipment->id,
                    'order_item_id'    => $orderItem->id,
                    'quantity_shipped' => $qtyToShip,
                ]);

                // Increment fulfilled quantity on the order item
                $orderItem->increment('quantity_fulfilled', $qtyToShip);
            }

            // Check if all order lines are fulfilled
            $totalOrdered = $order->items()->sum('quantity_ordered');
            $totalFulfilled = $order->items()->sum('quantity_fulfilled');
            $totalCancelled = $order->items()->sum('quantity_cancelled');

            if (($totalFulfilled + $totalCancelled) >= $totalOrdered && $order->status !== Order::STATUS_COMPLETED) {
                $order->update([
                    'status' => ($status === Shipment::STATUS_DELIVERED) ? Order::STATUS_COMPLETED : Order::STATUS_SHIPPED,
                ]);
            } elseif ($order->status === Order::STATUS_CONFIRMED || $order->status === Order::STATUS_PLACED) {
                $order->update(['status' => Order::STATUS_PROCESSING]);
            }

            return $shipment;
        });

        return response()->json([
            'message'  => 'Shipment created and order items fulfilled.',
            'shipment' => $shipment->load(['items.orderItem', 'order']),
        ], 201);
    }

    /**
     * Update the shipment delivery status or carrier tracking info.
     */
    public function update(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'status'            => ['sometimes', 'string', 'in:pending,packed,shipped,delivered,failed,cancelled'],
            'shipping_provider' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tracking_number'   => ['sometimes', 'nullable', 'string', 'max:150'],
            'notes'             => ['sometimes', 'nullable', 'string'],
        ]);

        $shipment = DB::transaction(function () use ($shipment, $validated) {
            $oldStatus = $shipment->status;
            $newStatus = $validated['status'] ?? $oldStatus;

            if ($newStatus === Shipment::STATUS_SHIPPED && $oldStatus !== Shipment::STATUS_SHIPPED) {
                $shipment->shipped_at = now();
                if ($shipment->order && $shipment->order->status !== Order::STATUS_COMPLETED) {
                    $shipment->order->update(['status' => Order::STATUS_SHIPPED]);
                }
            }

            if ($newStatus === Shipment::STATUS_DELIVERED && $oldStatus !== Shipment::STATUS_DELIVERED) {
                $shipment->delivered_at = now();
                // Check if all shipments for this order are delivered
                $allDelivered = !Shipment::where('order_id', $shipment->order_id)
                    ->where('id', '!=', $shipment->id)
                    ->where('status', '!=', Shipment::STATUS_DELIVERED)
                    ->exists();

                if ($allDelivered && $shipment->order) {
                    $shipment->order->update(['status' => Order::STATUS_COMPLETED]);
                }
            }

            if ($newStatus === Shipment::STATUS_CANCELLED && $oldStatus !== Shipment::STATUS_CANCELLED) {
                // Revert fulfilled quantity on order items
                foreach ($shipment->items as $item) {
                    $orderItem = OrderItem::find($item->order_item_id);
                    if ($orderItem) {
                        $orderItem->decrement('quantity_fulfilled', min($orderItem->quantity_fulfilled, $item->quantity_shipped));
                    }
                }
            }

            $shipment->update($validated);

            return $shipment;
        });

        return response()->json([
            'message'  => 'Shipment updated successfully.',
            'shipment' => $shipment->fresh(['items', 'order']),
        ]);
    }

    /**
     * Purge a draft/cancelled shipment with fulfillment reversal.
     */
    public function destroy(Shipment $shipment): JsonResponse
    {
        if (!in_array($shipment->status, [Shipment::STATUS_PENDING, Shipment::STATUS_CANCELLED])) {
            return response()->json([
                'message' => "Cannot delete a shipment with status '{$shipment->status}'. Only pending or cancelled packages can be deleted.",
            ], 409);
        }

        DB::transaction(function () use ($shipment) {
            if ($shipment->status === Shipment::STATUS_PENDING) {
                foreach ($shipment->items as $item) {
                    $orderItem = OrderItem::find($item->order_item_id);
                    if ($orderItem) {
                        $orderItem->decrement('quantity_fulfilled', min($orderItem->quantity_fulfilled, $item->quantity_shipped));
                    }
                }
            }
            $shipment->delete();
        });

        return response()->json([
            'message' => 'Shipment deleted successfully.',
        ]);
    }
}
