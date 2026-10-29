<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockBalance;
use App\Models\StockLocation;
use App\Models\StockReservation;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    /**
     * Process public customer online checkout.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'     => ['required', 'string', 'max:150'],
            'phone'             => ['required', 'string', 'max:50'],
            'email'             => ['nullable', 'email', 'max:150'],
            'delivery_address'  => ['required', 'string', 'max:500'],
            'city'              => ['nullable', 'string', 'max:100'],
            'fulfillment_type'  => ['nullable', 'string', 'in:delivery,pickup,counter'],
            'payment_method'    => ['required', 'string', 'max:50'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'customer_notes'    => ['nullable', 'string', 'max:1000'],
            'items'             => ['required', 'array', 'min:1'],
            'items.*.product_id'=> ['required'],
            'items.*.quantity'  => ['required', 'numeric', 'min:1'],
            'items.*.unit_price'=> ['nullable', 'numeric', 'min:0'],
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $authUserId = $request->user()?->id;

            // 1. Find or create customer
            $phoneClean = preg_replace('/[^\d+]/', '', $validated['phone']);
            $customer = null;

            if ($authUserId) {
                $customer = Customer::where('user_id', $authUserId)->first();
            }

            if (!$customer) {
                $customer = Customer::where('phone', $phoneClean)
                    ->orWhere(function ($q) use ($validated) {
                        if (!empty($validated['email'])) {
                            $q->where('email', $validated['email']);
                        }
                    })
                    ->first();
            }

            if (!$customer) {
                $codeSuffix = strtoupper(Str::random(5));
                $customer = Customer::create([
                    'user_id'             => $authUserId,
                    'customer_code'       => 'CUST-ONL-' . $codeSuffix,
                    'customer_type'       => Customer::TYPE_INDIVIDUAL,
                    'display_name'        => $validated['customer_name'],
                    'phone'               => $phoneClean,
                    'email'               => $validated['email'] ?? null,
                    'credit_limit'        => 0.00,
                    'default_credit_days' => 0,
                    'is_active'           => true,
                    'notes'               => 'Created via Ngus Online Store self-checkout.',
                ]);
            } else {
                $customer->update([
                    'user_id'      => $customer->user_id ?? $authUserId,
                    'display_name' => $validated['customer_name'],
                    'email'        => $validated['email'] ?? $customer->email,
                ]);
            }

            // 2. Create customer shipping address snapshot
            $address = CustomerAddress::create([
                'customer_id'    => $customer->id,
                'address_type'   => 'shipping',
                'label'          => 'Online Checkout Delivery',
                'address_line_1' => $validated['delivery_address'],
                'city'           => $validated['city'] ?? 'Addis Ababa',
                'state_region'   => 'Addis Ababa',
                'country_code'   => 'ET',
                'is_default'     => true,
            ]);

            // 3. Find default active store and stock location
            $store = Store::where('is_active', true)->first();
            $stockLocation = StockLocation::where('is_active', true)->first();

            // 4. Generate unique royal order number
            $orderNumber = 'NGS-ORD-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            $fulfillmentType = $validated['fulfillment_type'] ?? 'delivery';
            $shippingFee = ($fulfillmentType === 'delivery') ? 150.00 : 0.00;

            // 5. Create Order
            $order = Order::create([
                'order_number'              => $orderNumber,
                'source'                    => Order::SOURCE_ONLINE,
                'status'                    => Order::STATUS_CONFIRMED,
                'fulfillment_type'          => $fulfillmentType,
                'customer_id'               => $customer->id,
                'store_id'                  => $store?->id,
                'stock_location_id'         => $stockLocation?->id,
                'shipping_address_id'       => $address->id,
                'shipping_address_snapshot' => json_encode($address->toArray()),
                'currency_code'             => 'ETB',
                'created_by'                => $authUserId,
                'subtotal'                  => 0.00,
                'discount_total'            => 0.00,
                'tax_total'                 => 0.00,
                'shipping_fee'              => $shippingFee,
                'grand_total'               => 0.00,
                'customer_notes'            => $validated['customer_notes'] ?? null,
                'placed_at'                 => now(),
                'confirmed_at'              => now(),
            ]);

            $subtotal = 0.00;
            $taxTotal = 0.00;

            // 6. Process items
            foreach ($validated['items'] as $itemData) {
                $product = Product::find($itemData['product_id']);
                if (!$product) {
                    continue;
                }

                // Ensure a default ProductVariant exists
                $variant = ProductVariant::firstOrCreate(
                    ['product_id' => $product->id],
                    [
                        'sku'           => $product->sku ?? ('SKU-' . $product->id),
                        'variant_name'  => 'Standard Flagship Edition',
                        'cost_price'    => $product->cost_price ?? 0.00,
                        'selling_price' => $product->selling_price ?? 0.00,
                        'is_active'     => true,
                    ]
                );

                $qty = (float) $itemData['quantity'];
                $unitPrice = isset($itemData['unit_price']) && $itemData['unit_price'] > 0
                    ? (float) $itemData['unit_price']
                    : (float) ($product->selling_price ?? 0.00);

                // 15% VAT calculation
                $taxPercent = 15.0000;
                $lineSubtotal = round($unitPrice * $qty, 2);
                $taxAmount = round($lineSubtotal * ($taxPercent / 100), 2);
                $lineTotal = round($lineSubtotal + $taxAmount, 2);

                $subtotal += $lineSubtotal;
                $taxTotal += $taxAmount;

                $orderItem = OrderItem::create([
                    'order_id'              => $order->id,
                    'product_variant_id'    => $variant->id,
                    'product_name_snapshot' => $product->name,
                    'sku_snapshot'          => $product->sku ?? $variant->sku,
                    'quantity_ordered'      => $qty,
                    'quantity_fulfilled'    => 0,
                    'quantity_cancelled'    => 0,
                    'unit_price'            => $unitPrice,
                    'discount_amount'       => 0.00,
                    'tax_rate_percent'      => $taxPercent,
                    'tax_amount'            => $taxAmount,
                    'line_total'            => $lineTotal,
                ]);

                // Create stock reservation for this order
                if ($stockLocation) {
                    StockReservation::create([
                        'order_item_id'      => $orderItem->id,
                        'product_variant_id' => $variant->id,
                        'stock_location_id'  => $stockLocation->id,
                        'quantity'           => $qty,
                        'status'             => StockReservation::STATUS_ACTIVE,
                        'expires_at'         => now()->addDays(3),
                    ]);
                }
            }

            $grandTotal = round($subtotal + $taxTotal + $shippingFee, 2);

            // Update order final totals
            $order->update([
                'subtotal'    => $subtotal,
                'tax_total'   => $taxTotal,
                'grand_total' => $grandTotal,
            ]);

            // 7. Process payment recording
            $methodCode = strtolower($validated['payment_method']);
            $payMethod = PaymentMethod::where('code', $methodCode)
                ->orWhere('name', 'like', "%{$methodCode}%")
                ->first();

            if (!$payMethod) {
                $payMethod = PaymentMethod::create([
                    'code'          => $methodCode,
                    'name'          => strtoupper(str_replace('_', ' ', $methodCode)),
                    'method_type'   => str_contains($methodCode, 'birr') ? PaymentMethod::TYPE_MOBILE_MONEY : PaymentMethod::TYPE_CASH,
                    'provider_name' => str_contains($methodCode, 'telebirr') ? 'Ethio Telecom' : 'CBE',
                    'is_active'     => true,
                    'sort_order'    => 1,
                ]);
            }

            $payment = Payment::create([
                'payment_number'        => 'PAY-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'customer_id'           => $customer->id,
                'payment_method_id'     => $payMethod->id,
                'amount'                => $grandTotal,
                'currency_code'         => 'ETB',
                'status'                => Payment::STATUS_SUCCEEDED,
                'transaction_reference' => $validated['payment_reference'] ?? ('REF-' . strtoupper(Str::random(8))),
                'received_at'           => now(),
                'notes'                 => 'Customer online self-checkout for order ' . $order->order_number . ' via ' . $payMethod->name,
            ]);

            return [
                'order'    => $order->load(['customer', 'items', 'shippingAddress']),
                'payment'  => $payment->load('paymentMethod'),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Your order has been placed successfully!',
            'data'    => $result,
        ], 201);
    }
}
