<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\StockBalance;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StockTransferController extends Controller
{
    /**
     * GET /api/stock-transfers
     * List stock transfers with origin and destination location details
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockTransfer::with([
            'fromLocation.store:id,code,name',
            'toLocation.store:id,code,name',
            'requestedBy:id,name',
            'approvedBy:id,name',
        ])->latest();

        if ($request->filled('from_stock_location_id')) {
            $query->where('from_stock_location_id', $request->query('from_stock_location_id'));
        }

        if ($request->filled('to_stock_location_id')) {
            $query->where('to_stock_location_id', $request->query('to_stock_location_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/stock-transfers/{stockTransfer}
     * Get single stock transfer with items and locations
     */
    public function show(StockTransfer $stockTransfer): JsonResponse
    {
        return response()->json($stockTransfer->load([
            'fromLocation.store',
            'toLocation.store',
            'items.productVariant.product',
            'requestedBy:id,name,email',
            'approvedBy:id,name,email',
            'shippedBy:id,name,email',
            'receivedBy:id,name,email',
        ]));
    }

    /**
     * POST /api/stock-transfers
     * Create a new stock transfer request
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_stock_location_id'     => ['required', 'exists:stock_locations,id'],
            'to_stock_location_id'       => ['required', 'exists:stock_locations,id', 'different:from_stock_location_id'],
            'notes'                      => ['nullable', 'string'],
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.quantity_requested' => ['required', 'numeric', 'min:0.001'],
        ]);

        $transfer = DB::transaction(function () use ($request, $validated) {
            $stockTransfer = StockTransfer::create([
                'transfer_number'        => 'TRF-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'from_stock_location_id' => $validated['from_stock_location_id'],
                'to_stock_location_id'   => $validated['to_stock_location_id'],
                'status'                 => StockTransfer::STATUS_REQUESTED,
                'requested_by'           => $request->user()->id,
                'requested_at'           => now(),
                'notes'                  => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                StockTransferItem::create([
                    'stock_transfer_id'  => $stockTransfer->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity_requested' => $item['quantity_requested'],
                    'quantity_shipped'   => 0.000,
                    'quantity_received'  => 0.000,
                ]);
            }

            return $stockTransfer;
        });

        return response()->json([
            'message'        => 'Stock transfer request created successfully.',
            'stock_transfer' => $transfer->load(['fromLocation', 'toLocation', 'items.productVariant.product']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/stock-transfers/{stockTransfer}
     * Update transfer status (approving, dispatching in-transit, or receiving)
     */
    public function update(Request $request, StockTransfer $stockTransfer): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(StockTransfer::$statuses)],
            'notes'  => ['sometimes', 'nullable', 'string'],
        ]);

        $newStatus = $validated['status'];

        $stockTransfer = DB::transaction(function () use ($request, $stockTransfer, $newStatus, $validated) {
            // 1. Approval
            if ($newStatus === StockTransfer::STATUS_APPROVED) {
                $stockTransfer->approved_by = $request->user()->id;
            }

            // 2. Dispatch / In Transit: deduct from origin location
            if ($newStatus === StockTransfer::STATUS_IN_TRANSIT && $stockTransfer->status !== StockTransfer::STATUS_IN_TRANSIT) {
                foreach ($stockTransfer->items as $item) {
                    $originBalance = StockBalance::lockForUpdate()->firstOrCreate(
                        [
                            'stock_location_id'  => $stockTransfer->from_stock_location_id,
                            'product_variant_id' => $item->product_variant_id,
                        ],
                        ['quantity_on_hand' => 0.000]
                    );

                    if ($originBalance->quantity_on_hand < $item->quantity_requested) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock at origin location for variant ID {$item->product_variant_id}. Available: {$originBalance->quantity_on_hand}, Requested: {$item->quantity_requested}."],
                        ]);
                    }

                    $originBalance->decrement('quantity_on_hand', $item->quantity_requested);
                    $item->update(['quantity_shipped' => $item->quantity_requested]);
                }

                $stockTransfer->shipped_by = $request->user()->id;
                $stockTransfer->shipped_at = now();
            }

            // 3. Receipt: credit to destination location
            if ($newStatus === StockTransfer::STATUS_RECEIVED && $stockTransfer->status !== StockTransfer::STATUS_RECEIVED) {
                foreach ($stockTransfer->items as $item) {
                    $destBalance = StockBalance::lockForUpdate()->firstOrCreate(
                        [
                            'stock_location_id'  => $stockTransfer->to_stock_location_id,
                            'product_variant_id' => $item->product_variant_id,
                        ],
                        ['quantity_on_hand' => 0.000]
                    );

                    $qtyToReceive = $item->quantity_shipped > 0 ? $item->quantity_shipped : $item->quantity_requested;
                    $destBalance->increment('quantity_on_hand', $qtyToReceive);
                    $item->update(['quantity_received' => $qtyToReceive]);
                }

                $stockTransfer->received_by = $request->user()->id;
                $stockTransfer->received_at = now();
            }

            if (isset($validated['notes'])) {
                $stockTransfer->notes = $validated['notes'];
            }

            $stockTransfer->status = $newStatus;
            $stockTransfer->save();

            return $stockTransfer;
        });

        return response()->json([
            'message'        => 'Stock transfer status updated successfully.',
            'stock_transfer' => $stockTransfer->refresh()->load(['items.productVariant.product', 'fromLocation', 'toLocation']),
        ]);
    }

    /**
     * DELETE /api/stock-transfers/{stockTransfer}
     * Delete transfer (only draft or cancelled)
     */
    public function destroy(StockTransfer $stockTransfer): JsonResponse
    {
        if (in_array($stockTransfer->status, [StockTransfer::STATUS_IN_TRANSIT, StockTransfer::STATUS_RECEIVED])) {
            return response()->json([
                'message' => "Cannot delete stock transfer that is already '{$stockTransfer->status}'.",
            ], 409);
        }

        $stockTransfer->items()->delete();
        $stockTransfer->delete();

        return response()->json([
            'message' => 'Stock transfer deleted successfully.',
        ], 200);
    }
}
