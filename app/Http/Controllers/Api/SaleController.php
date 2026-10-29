<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Sale::query()->with(['customer', 'cashierShift', 'order'])->latest();

        if ($user && $user->role === 'cashier') {
            $query->where(function ($q) use ($user) {
                $q->where('cashier_id', $user->id)
                  ->orWhere('user_id', $user->id);
            });
        }

        $sales = $query->paginate()
            ->through(function (Sale $sale) {
                $amount = $sale->grand_total ?: $sale->total_amount;
                return [
                    'id'             => $sale->id,
                    'sale_number'    => $sale->sale_number ?: ('SALE-' . str_pad($sale->id, 5, '0', STR_PAD_LEFT)),
                    'order_id'       => $sale->order_id,
                    'customer_id'    => $sale->customer_id,
                    'customer_name'  => $sale->customer?->display_name ?? 'Walk-in Customer',
                    'cashier_id'     => $sale->cashier_id ?: $sale->user_id,
                    'status'         => $sale->status ?: 'posted',
                    'payment_status' => $sale->payment_status ?: 'paid',
                    'grand_total'    => (float) $amount,
                    'total_amount'   => (float) $amount,
                    'created_at'     => $sale->created_at,
                ];
            });

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sale = DB::transaction(function () use ($request, $validated) {
            $totalAmount = 0;
            $itemsSummary = [];

            foreach ($validated['items'] as $item) {
                // Lock row for update to prevent concurrent stock overdraft
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                // 1. Verify stock availability
                if ($product->quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for '{$product->name}'. Available: {$product->quantity}, Requested: {$item['quantity']}."]
                    ]);
                }

                // 2. Calculate true price using database selling_price (prevents client price tampering)
                $unitPrice = (float) $product->selling_price;
                $lineTotal = $unitPrice * $item['quantity'];
                $totalAmount += $lineTotal;

                // 3. Deduct sold quantity from inventory
                $product->decrement('quantity', $item['quantity']);

                $itemsSummary[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity_sold' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'remaining_stock' => $product->fresh()->quantity,
                ];
            }

            // 4. Create Sale Record
            $saleData = [
                'user_id' => $request->user()->id,
                'total_amount' => $totalAmount,
            ];

            if (Schema::hasColumn('sales', 'order_id')) {
                $order = Order::create([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'source' => Order::SOURCE_POS,
                    'status' => Order::STATUS_COMPLETED,
                    'fulfillment_type' => Order::FULFILLMENT_COUNTER,
                    'created_by' => $request->user()->id,
                    'subtotal' => $totalAmount,
                    'grand_total' => $totalAmount,
                    'placed_at' => now(),
                    'confirmed_at' => now(),
                ]);
                $saleData['order_id'] = $order->id;
            }

            if (Schema::hasColumn('sales', 'cashier_id')) {
                $saleData['cashier_id'] = $request->user()->id;
            }
            if (Schema::hasColumn('sales', 'grand_total')) {
                $saleData['grand_total'] = $totalAmount;
            }
            if (Schema::hasColumn('sales', 'subtotal')) {
                $saleData['subtotal'] = $totalAmount;
            }
            if (Schema::hasColumn('sales', 'sale_number')) {
                $saleData['sale_number'] = 'SALE-' . strtoupper(uniqid());
            }

            $sale = Sale::create($saleData);
            $sale->items_summary = $itemsSummary;

            return $sale;
        });

        return response()->json([
            'message' => 'Sale completed successfully.',
            'sale' => [
                'id' => $sale->id,
                'cashier_id' => $request->user()->id,
                'total_amount' => $sale->total_amount,
                'items' => $sale->items_summary,
                'created_at' => $sale->created_at,
            ],
        ], 201);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'cashier') {
            abort_unless($sale->user_id === $user->id || $sale->cashier_id === $user->id, 403);
        }

        return response()->json($sale->load(['customer', 'cashierShift', 'order']));
    }
}