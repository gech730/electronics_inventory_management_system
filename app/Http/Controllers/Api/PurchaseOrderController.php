<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PurchaseOrderController extends Controller
{
    /**
     * GET /api/purchase-orders
     * List purchase orders with filtering by supplier, store, or status
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with([
            'supplier:id,supplier_code,name',
            'store:id,code,name',
            'destinationStockLocation:id,code,name',
            'createdBy:id,name',
        ])->latest();

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/purchase-orders/{purchaseOrder}
     * Get single purchase order with all items and goods receipts
     */
    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        return response()->json($purchaseOrder->load([
            'supplier',
            'store',
            'destinationStockLocation',
            'items.productVariant.product',
            'goodsReceipts.items',
            'createdBy:id,name,email',
            'approvedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/purchase-orders
     * Create a new purchase order with line items
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'                   => ['required', 'exists:suppliers,id'],
            'store_id'                      => ['required', 'exists:stores,id'],
            'destination_stock_location_id' => ['required', 'exists:stock_locations,id'],
            'currency_code'                 => ['nullable', 'string', 'max:3'],
            'ordered_at'                    => ['nullable', 'date'],
            'expected_at'                   => ['nullable', 'date'],
            'notes'                         => ['nullable', 'string'],
            'items'                         => ['required', 'array', 'min:1'],
            'items.*.product_variant_id'    => ['required', 'exists:product_variants,id'],
            'items.*.quantity_ordered'      => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_cost'             => ['required', 'numeric', 'min:0'],
            'items.*.discount_amount'       => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_amount'            => ['nullable', 'numeric', 'min:0'],
        ]);

        $po = DB::transaction(function () use ($request, $validated) {
            $subtotal      = 0;
            $discountTotal = 0;
            $taxTotal      = 0;
            $itemsData     = [];

            foreach ($validated['items'] as $item) {
                $qty          = (float) $item['quantity_ordered'];
                $cost         = (float) $item['unit_cost'];
                $discount     = isset($item['discount_amount']) ? (float) $item['discount_amount'] : 0.00;
                $tax          = isset($item['tax_amount']) ? (float) $item['tax_amount'] : 0.00;
                $lineTotal    = ($qty * $cost) - $discount + $tax;

                $subtotal      += ($qty * $cost);
                $discountTotal += $discount;
                $taxTotal      += $tax;

                $itemsData[] = [
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity_ordered'   => $qty,
                    'quantity_received'  => 0.000,
                    'unit_cost'          => $cost,
                    'discount_amount'    => $discount,
                    'tax_amount'         => $tax,
                    'line_total'         => $lineTotal,
                ];
            }

            $grandTotal = $subtotal - $discountTotal + $taxTotal;

            $purchaseOrder = PurchaseOrder::create([
                'purchase_order_number'         => 'PO-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'supplier_id'                   => $validated['supplier_id'],
                'store_id'                      => $validated['store_id'],
                'destination_stock_location_id' => $validated['destination_stock_location_id'],
                'status'                        => PurchaseOrder::STATUS_DRAFT,
                'currency_code'                 => $validated['currency_code'] ?? 'ETB',
                'ordered_at'                    => $validated['ordered_at'] ?? now(),
                'expected_at'                   => $validated['expected_at'] ?? null,
                'subtotal'                      => $subtotal,
                'discount_total'                => $discountTotal,
                'tax_total'                     => $taxTotal,
                'grand_total'                   => $grandTotal,
                'created_by'                    => $request->user()->id,
                'notes'                         => $validated['notes'] ?? null,
            ]);

            foreach ($itemsData as $itemRow) {
                $itemRow['purchase_order_id'] = $purchaseOrder->id;
                PurchaseOrderItem::create($itemRow);
            }

            return $purchaseOrder;
        });

        return response()->json([
            'message'        => 'Purchase order created successfully.',
            'purchase_order' => $po->load(['items.productVariant.product', 'supplier', 'store']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/purchase-orders/{purchaseOrder}
     * Update purchase order status or header details
     */
    public function update(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $validated = $request->validate([
            'status'      => ['sometimes', 'required', 'string', Rule::in(PurchaseOrder::$statuses)],
            'expected_at' => ['sometimes', 'nullable', 'date'],
            'notes'       => ['sometimes', 'nullable', 'string'],
        ]);

        if (isset($validated['status']) && $validated['status'] === PurchaseOrder::STATUS_APPROVED && $purchaseOrder->status !== PurchaseOrder::STATUS_APPROVED) {
            $validated['approved_by'] = $request->user()->id;
        }

        $purchaseOrder->update($validated);

        return response()->json([
            'message'        => 'Purchase order updated successfully.',
            'purchase_order' => $purchaseOrder->refresh()->load(['supplier', 'store', 'items']),
        ]);
    }

    /**
     * DELETE /api/purchase-orders/{purchaseOrder}
     * Delete purchase order (only draft or cancelled)
     */
    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (in_array($purchaseOrder->status, [PurchaseOrder::STATUS_APPROVED, PurchaseOrder::STATUS_PARTIALLY_RECEIVED, PurchaseOrder::STATUS_RECEIVED])) {
            return response()->json([
                'message' => "Cannot delete purchase order with status '{$purchaseOrder->status}'. Cancel it instead.",
            ], 409);
        }

        $purchaseOrder->items()->delete();
        $purchaseOrder->delete();

        return response()->json([
            'message' => 'Purchase order deleted successfully.',
        ], 200);
    }
}
