<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\StockBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StockAdjustmentController extends Controller
{
    /**
     * GET /api/stock-adjustments
     * List cycle counts and inventory adjustments
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockAdjustment::with([
            'stockLocation.store:id,code,name',
            'createdBy:id,name',
            'postedBy:id,name',
        ])->latest();

        if ($request->filled('stock_location_id')) {
            $query->where('stock_location_id', $request->query('stock_location_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/stock-adjustments/{stockAdjustment}
     * Get single stock adjustment with line variance items
     */
    public function show(StockAdjustment $stockAdjustment): JsonResponse
    {
        return response()->json($stockAdjustment->load([
            'stockLocation.store',
            'items.productVariant.product',
            'createdBy:id,name,email',
            'approvedBy:id,name,email',
            'postedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/stock-adjustments
     * Record a cycle count / discrepancy audit
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stock_location_id'          => ['required', 'exists:stock_locations,id'],
            'reason'                     => ['required', 'string', 'max:255'],
            'notes'                      => ['nullable', 'string'],
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.counted_quantity'   => ['required', 'numeric', 'min:0'],
            'items.*.unit_cost'          => ['nullable', 'numeric', 'min:0'],
            'items.*.notes'              => ['nullable', 'string'],
        ]);

        $adjustment = DB::transaction(function () use ($request, $validated) {
            $stockAdjustment = StockAdjustment::create([
                'adjustment_number' => 'ADJ-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'stock_location_id' => $validated['stock_location_id'],
                'status'            => StockAdjustment::STATUS_DRAFT,
                'reason'            => $validated['reason'],
                'created_by'        => $request->user()->id,
                'counted_at'        => now(),
                'notes'             => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                // Fetch current system balance
                $balance = StockBalance::where('stock_location_id', $validated['stock_location_id'])
                    ->where('product_variant_id', $item['product_variant_id'])
                    ->first();

                $systemQty   = $balance ? (float) $balance->quantity_on_hand : 0.000;
                $countedQty  = (float) $item['counted_quantity'];
                $diffQty     = $countedQty - $systemQty;

                StockAdjustmentItem::create([
                    'stock_adjustment_id' => $stockAdjustment->id,
                    'product_variant_id'  => $item['product_variant_id'],
                    'system_quantity'     => $systemQty,
                    'counted_quantity'    => $countedQty,
                    'difference_quantity' => $diffQty,
                    'unit_cost'           => $item['unit_cost'] ?? 0.00,
                    'notes'               => $item['notes'] ?? null,
                ]);
            }

            return $stockAdjustment;
        });

        return response()->json([
            'message'          => 'Stock adjustment drafted successfully.',
            'stock_adjustment' => $adjustment->load(['stockLocation.store', 'items.productVariant.product']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/stock-adjustments/{stockAdjustment}
     * Update adjustment status or post variance to inventory ledger
     */
    public function update(Request $request, StockAdjustment $stockAdjustment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(StockAdjustment::$statuses)],
            'notes'  => ['sometimes', 'nullable', 'string'],
        ]);

        $newStatus = $validated['status'];

        $stockAdjustment = DB::transaction(function () use ($request, $stockAdjustment, $newStatus, $validated) {
            // Approval
            if ($newStatus === StockAdjustment::STATUS_APPROVED) {
                $stockAdjustment->approved_by = $request->user()->id;
            }

            // Post variance to live inventory
            if ($newStatus === StockAdjustment::STATUS_POSTED && $stockAdjustment->status !== StockAdjustment::STATUS_POSTED) {
                foreach ($stockAdjustment->items as $item) {
                    $balance = StockBalance::lockForUpdate()->firstOrCreate(
                        [
                            'stock_location_id'  => $stockAdjustment->stock_location_id,
                            'product_variant_id' => $item->product_variant_id,
                        ],
                        ['quantity_on_hand' => 0.000]
                    );

                    // Update balance directly to counted quantity
                    $balance->quantity_on_hand = $item->counted_quantity;
                    $balance->save();

                    // Update catalog product quantity with variance difference
                    $variant = ProductVariant::find($item->product_variant_id);
                    if ($variant && $variant->product_id) {
                        $diffInt = (int) round($item->difference_quantity);
                        if ($diffInt > 0) {
                            Product::where('id', $variant->product_id)->increment('quantity', $diffInt);
                        } elseif ($diffInt < 0) {
                            Product::where('id', $variant->product_id)->decrement('quantity', abs($diffInt));
                        }
                    }
                }

                $stockAdjustment->posted_by = $request->user()->id;
                $stockAdjustment->posted_at = now();
            }

            if (isset($validated['notes'])) {
                $stockAdjustment->notes = $validated['notes'];
            }

            $stockAdjustment->status = $newStatus;
            $stockAdjustment->save();

            return $stockAdjustment;
        });

        return response()->json([
            'message'          => 'Stock adjustment status updated successfully.',
            'stock_adjustment' => $stockAdjustment->refresh()->load(['items.productVariant.product', 'stockLocation.store']),
        ]);
    }

    /**
     * DELETE /api/stock-adjustments/{stockAdjustment}
     * Delete draft or cancelled adjustment
     */
    public function destroy(StockAdjustment $stockAdjustment): JsonResponse
    {
        if ($stockAdjustment->status === StockAdjustment::STATUS_POSTED) {
            return response()->json([
                'message' => 'Cannot delete an adjustment that has already been posted to the inventory ledger.',
            ], 409);
        }

        $stockAdjustment->items()->delete();
        $stockAdjustment->delete();

        return response()->json([
            'message' => 'Stock adjustment deleted successfully.',
        ], 200);
    }
}
