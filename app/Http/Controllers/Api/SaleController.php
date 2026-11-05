<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockBalance;
use App\Models\StockLocation;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Sale::query()
            ->with([
                'customer:id,customer_code,display_name,phone',
                'cashierShift:id,pos_register_id,status,opened_by',
                'cashierShift.posRegister:id,code,name',
                'cashier:id,name,email',
                'order:id,order_number,status',
                'items',
            ])
            ->latest();

        // Enforce cashier isolation: Cashiers only see their own sales!
        if ($user && $user->role === 'cashier') {
            $query->where(function ($q) use ($user) {
                $q->where('cashier_id', $user->id)
                  ->orWhere('user_id', $user->id);
            });
        } elseif ($request->filled('cashier_id')) {
            $query->where('cashier_id', $request->cashier_id);
        }

        if ($request->filled('cashier_shift_id')) {
            $query->where('cashier_shift_id', $request->cashier_shift_id);
        }

        $sales = $query->paginate($request->integer('per_page', 25))
            ->through(function (Sale $sale) {
                $amount = $sale->grand_total ?: $sale->total_amount;
                return [
                    'id'               => $sale->id,
                    'sale_number'      => $sale->sale_number ?: ('SALE-' . str_pad($sale->id, 5, '0', STR_PAD_LEFT)),
                    'order_id'         => $sale->order_id,
                    'order_number'     => $sale->order?->order_number,
                    'customer_id'      => $sale->customer_id,
                    'customer_name'    => $sale->customer?->display_name ?? 'Walk-in Customer',
                    'cashier_id'       => $sale->cashier_id ?: $sale->user_id,
                    'cashier_name'     => $sale->cashier?->name ?? 'Staff Cashier',
                    'cashier_shift_id' => $sale->cashier_shift_id,
                    'register_code'    => $sale->cashierShift?->posRegister?->code ?? 'COUNTER-1',
                    'status'           => $sale->status ?: 'posted',
                    'payment_status'   => $sale->payment_status ?: 'paid',
                    'grand_total'      => (float) $amount,
                    'total_amount'     => (float) $amount,
                    'items_count'      => $sale->items->count(),
                    'items'            => $sale->items->map(function ($it) {
                        return [
                            'id'           => $it->id,
                            'product_name' => $it->product_name_snapshot,
                            'sku'          => $it->sku_snapshot,
                            'quantity'     => (float) $it->quantity,
                            'unit_price'   => (float) $it->unit_price,
                            'line_total'   => (float) $it->line_total,
                        ];
                    }),
                    'created_at'       => $sale->created_at,
                ];
            });

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'integer', 'min:1'],
            'cashier_shift_id'   => ['nullable', 'exists:cashier_shifts,id'],
            'customer_id'        => ['nullable', 'exists:customers,id'],
        ]);

        $sale = DB::transaction(function () use ($request, $validated) {
            $user = $request->user();
            $userId = $user ? $user->id : 1;

            // Resolve cashier shift: use passed ID or find active open shift for this user
            $shiftId = $validated['cashier_shift_id'] ?? null;
            if (!$shiftId) {
                $shiftId = CashierShift::where('opened_by', $userId)
                    ->where('status', CashierShift::STATUS_OPEN)
                    ->value('id');
            }

            // Resolve store and stock location
            $register = null;
            if ($shiftId) {
                $shift = CashierShift::find($shiftId);
                $register = $shift?->posRegister;
            }
            $storeId = $register?->store_id ?? Store::value('id');
            $locationId = StockLocation::where('store_id', $storeId)->value('id') ?? StockLocation::value('id');

            $totalAmount = 0;
            $itemsSummary = [];
            $lineItemsData = [];

            foreach ($validated['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for '{$product->name}'. Available: {$product->quantity}, Requested: {$item['quantity']}."]
                    ]);
                }

                $unitPrice = (float) $product->selling_price;
                $lineTotal = round($unitPrice * $item['quantity'], 2);
                $totalAmount += $lineTotal;

                // 1. Decrement catalog product quantity
                $product->decrement('quantity', $item['quantity']);

                // 2. Ensure variant and decrement stock balance
                $variant = ProductVariant::where('product_id', $product->id)->first();
                if (!$variant) {
                    $variant = ProductVariant::create([
                        'product_id'    => $product->id,
                        'sku'           => $product->sku ?? ('SKU-' . $product->id),
                        'variant_name'  => 'Standard',
                        'cost_price'    => $product->cost_price ?? 0,
                        'selling_price' => $product->selling_price ?? 0,
                        'is_active'     => true,
                    ]);
                }

                if ($variant && $locationId) {
                    $balance = StockBalance::lockForUpdate()->firstOrCreate(
                        ['stock_location_id' => $locationId, 'product_variant_id' => $variant->id],
                        ['quantity_on_hand' => 0.000, 'quantity_reserved' => 0.000]
                    );
                    $balance->decrement('quantity_on_hand', min($balance->quantity_on_hand, $item['quantity']));
                }

                $lineItemsData[] = [
                    'product'    => $product,
                    'variant'    => $variant,
                    'quantity'   => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];

                $itemsSummary[] = [
                    'product_id'      => $product->id,
                    'product_name'    => $product->name,
                    'sku'             => $product->sku,
                    'quantity_sold'   => $item['quantity'],
                    'unit_price'      => $unitPrice,
                    'line_total'      => $lineTotal,
                    'remaining_stock' => $product->fresh()->quantity,
                ];
            }

            // 3. Create POS Order record
            $order = Order::create([
                'order_number'      => 'ORD-' . strtoupper(uniqid()),
                'source'            => Order::SOURCE_POS,
                'status'            => Order::STATUS_COMPLETED,
                'fulfillment_type'  => Order::FULFILLMENT_COUNTER,
                'customer_id'       => $validated['customer_id'] ?? null,
                'store_id'          => $storeId,
                'stock_location_id' => $locationId,
                'pos_register_id'   => $register?->id,
                'cashier_shift_id'  => $shiftId,
                'created_by'        => $userId,
                'subtotal'          => $totalAmount,
                'grand_total'       => $totalAmount,
                'placed_at'         => now(),
                'confirmed_at'      => now(),
                'completed_at'      => now(),
            ]);

            // 4. Create OrderItem rows
            $orderItemIds = [];
            foreach ($lineItemsData as $line) {
                $oi = OrderItem::create([
                    'order_id'              => $order->id,
                    'product_variant_id'    => $line['variant']->id,
                    'product_name_snapshot' => $line['product']->name,
                    'sku_snapshot'          => $line['product']->sku ?? $line['variant']->sku,
                    'quantity_ordered'      => $line['quantity'],
                    'quantity_fulfilled'    => $line['quantity'],
                    'quantity_cancelled'    => 0,
                    'unit_price'            => $line['unit_price'],
                    'line_total'            => $line['line_total'],
                ]);
                $orderItemIds[] = $oi->id;
            }

            // 5. Create Sale record attributed to this specific cashier
            $sale = Sale::create([
                'sale_number'       => 'SALE-' . date('Ymd') . '-' . strtoupper(Str::random(5)),
                'order_id'          => $order->id,
                'customer_id'       => $validated['customer_id'] ?? null,
                'store_id'          => $storeId,
                'stock_location_id' => $locationId,
                'cashier_shift_id'  => $shiftId,
                'cashier_id'        => $userId,
                'user_id'           => $userId,
                'status'            => Sale::STATUS_POSTED,
                'payment_status'    => Sale::PAYMENT_PAID,
                'currency_code'     => 'ETB',
                'subtotal'          => $totalAmount,
                'grand_total'       => $totalAmount,
                'total_amount'      => $totalAmount,
                'issued_at'         => now(),
            ]);

            // 6. Create SaleItem rows
            foreach ($lineItemsData as $idx => $line) {
                SaleItem::create([
                    'sale_id'               => $sale->id,
                    'order_item_id'         => $orderItemIds[$idx] ?? null,
                    'product_variant_id'    => $line['variant']->id,
                    'product_name_snapshot' => $line['product']->name,
                    'sku_snapshot'          => $line['product']->sku ?? $line['variant']->sku,
                    'quantity'              => $line['quantity'],
                    'unit_price'            => $line['unit_price'],
                    'discount_amount'       => 0.00,
                    'tax_rate_percent'      => 15.0000,
                    'tax_amount'            => round($line['line_total'] * 0.15, 2),
                    'line_total'            => $line['line_total'],
                ]);
            }

            $sale->items_summary = $itemsSummary;
            return $sale;
        });

        return response()->json([
            'message' => 'Sale completed successfully.',
            'sale'    => [
                'id'           => $sale->id,
                'sale_number'  => $sale->sale_number,
                'cashier_id'   => $sale->cashier_id,
                'total_amount' => $sale->total_amount,
                'grand_total'  => $sale->grand_total,
                'items'        => $sale->items_summary,
                'created_at'   => $sale->created_at,
            ],
        ], 201);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->role === 'cashier') {
            abort_unless($sale->user_id === $user->id || $sale->cashier_id === $user->id, 403);
        }

        return response()->json($sale->load([
            'customer',
            'cashierShift.posRegister',
            'order.items',
            'cashier:id,name,email',
            'items',
        ]));
    }
}