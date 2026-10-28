<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GoodsReceiptController extends Controller
{
    /**
     * GET /api/goods-receipts
     * List goods receipts with supplier and location relations
     */
    public function index(Request $request): JsonResponse
    {
        $query = GoodsReceipt::with([
            'supplier:id,supplier_code,name',
            'stockLocation.store:id,code,name',
            'receivedBy:id,name',
            'purchaseOrder:id,purchase_order_number,status',
        ])->latest();

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        if ($request->filled('purchase_order_id')) {
            $query->where('purchase_order_id', $request->query('purchase_order_id'));
        }

        if ($request->filled('stock_location_id')) {
            $query->where('stock_location_id', $request->query('stock_location_id'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/goods-receipts/{goodsReceipt}
     * Get single goods receipt details with received items
     */
    public function show(GoodsReceipt $goodsReceipt): JsonResponse
    {
        return response()->json($goodsReceipt->load([
            'supplier',
            'stockLocation.store',
            'purchaseOrder',
            'items.productVariant.product',
            'receivedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/goods-receipts
     * Receive goods into warehouse, increment stock balance and update catalog
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'                     => ['required', 'exists:suppliers,id'],
            'stock_location_id'               => ['required', 'exists:stock_locations,id'],
            'purchase_order_id'               => ['nullable', 'exists:purchase_orders,id'],
            'supplier_delivery_note'          => ['nullable', 'string', 'max:100'],
            'notes'                           => ['nullable', 'string'],
            'items'                           => ['required', 'array', 'min:1'],
            'items.*.product_variant_id'      => ['required', 'exists:product_variants,id'],
            'items.*.quantity_received'       => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_cost'               => ['required', 'numeric', 'min:0'],
            'items.*.purchase_order_item_id'  => ['nullable', 'exists:purchase_order_items,id'],
        ]);

        $receipt = DB::transaction(function () use ($request, $validated) {
            $goodsReceipt = GoodsReceipt::create([
                'receipt_number'         => 'GRN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'purchase_order_id'      => $validated['purchase_order_id'] ?? null,
                'supplier_id'            => $validated['supplier_id'],
                'stock_location_id'      => $validated['stock_location_id'],
                'status'                 => GoodsReceipt::STATUS_POSTED,
                'supplier_delivery_note' => $validated['supplier_delivery_note'] ?? null,
                'received_at'            => now(),
                'received_by'            => $request->user()->id,
                'notes'                  => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $qty = (float) $item['quantity_received'];

                // 1. Record Goods Receipt Item
                GoodsReceiptItem::create([
                    'goods_receipt_id'       => $goodsReceipt->id,
                    'purchase_order_item_id' => $item['purchase_order_item_id'] ?? null,
                    'product_variant_id'     => $item['product_variant_id'],
                    'quantity_received'      => $qty,
                    'unit_cost'              => $item['unit_cost'],
                ]);

                // 2. Increment StockBalance for this variant at this location
                $balance = StockBalance::firstOrCreate(
                    [
                        'stock_location_id'  => $validated['stock_location_id'],
                        'product_variant_id' => $item['product_variant_id'],
                    ],
                    [
                        'quantity_on_hand'   => 0.000,
                        'quantity_reserved'  => 0.000,
                        'reorder_level'      => 0.000,
                    ]
                );
                $balance->increment('quantity_on_hand', $qty);

                // 3. Increment Master Product Catalog Quantity
                $variant = ProductVariant::find($item['product_variant_id']);
                if ($variant && $variant->product_id) {
                    Product::where('id', $variant->product_id)->increment('quantity', (int) $qty);
                }

                // 4. Update PO Item received count if linked
                if (!empty($item['purchase_order_item_id'])) {
                    PurchaseOrderItem::where('id', $item['purchase_order_item_id'])->increment('quantity_received', $qty);
                }
            }

            // 5. Update PO status if tied to a PO
            if (!empty($validated['purchase_order_id'])) {
                $po = PurchaseOrder::with('items')->find($validated['purchase_order_id']);
                if ($po) {
                    $allReceived = $po->items->every(fn ($i) => $i->quantity_received >= $i->quantity_ordered);
                    $po->update([
                        'status' => $allReceived ? PurchaseOrder::STATUS_RECEIVED : PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                    ]);
                }
            }

            return $goodsReceipt;
        });

        return response()->json([
            'message'       => 'Goods receipt posted and inventory successfully updated.',
            'goods_receipt' => $receipt->load(['items.productVariant.product', 'supplier', 'stockLocation.store']),
        ], 201);
    }
}
