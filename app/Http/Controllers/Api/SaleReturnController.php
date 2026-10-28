<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleReturnController extends Controller
{
    /**
     * GET /api/sale-returns
     * List sales returns with sale, customer, and processedBy relations
     */
    public function index(Request $request): JsonResponse
    {
        $query = SaleReturn::with([
            'sale:id,sale_number,grand_total,status,payment_status',
            'customer:id,customer_code,display_name,phone',
            'restockLocation:id,code,name',
            'processedBy:id,name,email',
        ])->withCount(['items', 'refunds'])->latest();

        if ($request->filled('sale_id')) {
            $query->where('sale_id', $request->query('sale_id'));
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->query('customer_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/sale-returns/{saleReturn}
     * Get detailed return record including return lines, restock location, and refunds
     */
    public function show(SaleReturn $saleReturn): JsonResponse
    {
        return response()->json($saleReturn->load([
            'sale.items',
            'customer',
            'restockLocation.store',
            'processedBy:id,name,email',
            'items.saleItem',
            'items.productVariant.product',
            'refunds.paymentMethod',
        ]));
    }

    /**
     * POST /api/sale-returns
     * Create a new sale return request and optionally restock returned items
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sale_id'                     => ['required', 'exists:sales,id'],
            'customer_id'                 => ['nullable', 'exists:customers,id'],
            'status'                      => ['nullable', 'in:requested,approved,rejected,received,refunded,completed,cancelled'],
            'reason'                      => ['nullable', 'string', 'max:500'],
            'restock_to_location_id'      => ['nullable', 'exists:stock_locations,id'],
            'items'                       => ['required', 'array', 'min:1'],
            'items.*.sale_item_id'        => ['required', 'exists:sale_items,id'],
            'items.*.product_variant_id'  => ['nullable', 'exists:product_variants,id'],
            'items.*.quantity'            => ['required', 'numeric', 'min:0.001'],
            'items.*.condition'           => ['nullable', 'in:sellable,damaged,opened,defective'],
            'items.*.restock'             => ['nullable', 'boolean'],
            'items.*.refund_amount'       => ['nullable', 'numeric', 'min:0'],
        ]);

        $saleReturn = DB::transaction(function () use ($request, $validated) {
            $sale = Sale::with('items')->findOrFail($validated['sale_id']);
            $customerId = $validated['customer_id'] ?? $sale->customer_id;
            $restockLocationId = $validated['restock_to_location_id'] ?? $sale->stock_location_id;
            $status = $validated['status'] ?? SaleReturn::STATUS_REQUESTED;

            $returnNumber = 'RET-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

            $totalRefund = 0;
            $returnItemsData = [];

            foreach ($validated['items'] as $item) {
                /** @var SaleItem|null $saleItem */
                $saleItem = $sale->items->firstWhere('id', $item['sale_item_id']);
                if (!$saleItem) {
                    throw ValidationException::withMessages([
                        'items' => ["Sale item ID #{$item['sale_item_id']} does not belong to Sale #{$sale->id} ({$sale->sale_number})."],
                    ]);
                }

                $variantId = $item['product_variant_id'] ?? $saleItem->product_variant_id;
                $quantityToReturn = (float) $item['quantity'];

                // Calculate already returned quantity for this line across active returns
                $previouslyReturned = (float) SaleReturnItem::where('sale_item_id', $saleItem->id)
                    ->whereHas('saleReturn', function ($q) {
                        $q->whereNotIn('status', [SaleReturn::STATUS_REJECTED, SaleReturn::STATUS_CANCELLED]);
                    })
                    ->sum('quantity');

                $maxReturnable = max(0, (float) $saleItem->quantity - $previouslyReturned);
                if ($quantityToReturn > $maxReturnable) {
                    throw ValidationException::withMessages([
                        'items' => ["Cannot return {$quantityToReturn} units for item #{$saleItem->id}. Only {$maxReturnable} units remain eligible for return."],
                    ]);
                }

                // Compute proportionate refund amount if not provided
                if (isset($item['refund_amount']) && $item['refund_amount'] !== null) {
                    $itemRefund = (float) $item['refund_amount'];
                } else {
                    $unitPrice = (float) $saleItem->quantity > 0 ? ((float) $saleItem->line_total / (float) $saleItem->quantity) : 0;
                    $itemRefund = round($unitPrice * $quantityToReturn, 2);
                }

                $totalRefund += $itemRefund;
                $condition = $item['condition'] ?? 'sellable';
                $restock = isset($item['restock']) ? (bool) $item['restock'] : ($condition === 'sellable');

                $returnItemsData[] = [
                    'sale_item'          => $saleItem,
                    'product_variant_id' => $variantId,
                    'quantity'           => $quantityToReturn,
                    'condition'          => $condition,
                    'restock'            => $restock,
                    'refund_amount'      => $itemRefund,
                ];
            }

            $isReceived = in_array($status, [SaleReturn::STATUS_RECEIVED, SaleReturn::STATUS_COMPLETED]);

            $createdReturn = SaleReturn::create([
                'return_number'          => $returnNumber,
                'sale_id'                => $sale->id,
                'customer_id'            => $customerId,
                'status'                 => $status,
                'reason'                 => $validated['reason'] ?? null,
                'requested_at'           => now(),
                'received_at'            => $isReceived ? now() : null,
                'processed_by'           => $request->user()?->id,
                'refund_total'           => $totalRefund,
                'restock_to_location_id' => $restockLocationId,
            ]);

            foreach ($returnItemsData as $itemData) {
                SaleReturnItem::create([
                    'sale_return_id'     => $createdReturn->id,
                    'sale_item_id'       => $itemData['sale_item']->id,
                    'product_variant_id' => $itemData['product_variant_id'],
                    'quantity'           => $itemData['quantity'],
                    'condition'          => $itemData['condition'],
                    'restock'            => $itemData['restock'],
                    'refund_amount'      => $itemData['refund_amount'],
                ]);

                // If created as received and restock is enabled, increment stock balances
                if ($isReceived && $itemData['restock'] && $restockLocationId) {
                    $balance = StockBalance::firstOrCreate(
                        [
                            'stock_location_id'  => $restockLocationId,
                            'product_variant_id' => $itemData['product_variant_id'],
                        ],
                        [
                            'quantity_on_hand'  => 0,
                            'quantity_reserved' => 0,
                        ]
                    );
                    $balance->increment('quantity_on_hand', $itemData['quantity']);

                    $variant = ProductVariant::find($itemData['product_variant_id']);
                    if ($variant && $variant->product_id) {
                        Product::where('id', $variant->product_id)->increment('quantity', $itemData['quantity']);
                    }
                }
            }

            // Sync parent sale status
            $this->syncSaleStatus($sale);

            return $createdReturn;
        });

        return response()->json([
            'message' => 'Sale return request created successfully.',
            'return'  => $saleReturn->load(['items.productVariant', 'customer', 'sale']),
        ], 201);
    }

    /**
     * PUT/PATCH /api/sale-returns/{saleReturn}
     * Update status, reason, restock location or process stock receipt
     */
    public function update(Request $request, SaleReturn $saleReturn): JsonResponse
    {
        $validated = $request->validate([
            'status'                 => ['sometimes', 'in:requested,approved,rejected,received,refunded,completed,cancelled'],
            'reason'                 => ['nullable', 'string', 'max:500'],
            'restock_to_location_id' => ['nullable', 'exists:stock_locations,id'],
        ]);

        DB::transaction(function () use ($validated, $saleReturn) {
            $oldStatus = $saleReturn->status;
            $newStatus = $validated['status'] ?? $oldStatus;
            $locationId = $validated['restock_to_location_id'] ?? $saleReturn->restock_to_location_id ?? $saleReturn->sale?->stock_location_id;

            $wasReceived = in_array($oldStatus, [SaleReturn::STATUS_RECEIVED, SaleReturn::STATUS_COMPLETED]);
            $isNowReceived = in_array($newStatus, [SaleReturn::STATUS_RECEIVED, SaleReturn::STATUS_COMPLETED]);

            // Transitioning to received: Restock items
            if (!$wasReceived && $isNowReceived) {
                $saleReturn->load('items');
                foreach ($saleReturn->items as $item) {
                    if ($item->restock && $locationId) {
                        $balance = StockBalance::firstOrCreate(
                            [
                                'stock_location_id'  => $locationId,
                                'product_variant_id' => $item->product_variant_id,
                            ],
                            ['quantity_on_hand' => 0, 'quantity_reserved' => 0]
                        );
                        $balance->increment('quantity_on_hand', $item->quantity);

                        $variant = ProductVariant::find($item->product_variant_id);
                        if ($variant && $variant->product_id) {
                            Product::where('id', $variant->product_id)->increment('quantity', $item->quantity);
                        }
                    }
                }
                $saleReturn->received_at = now();
            }

            // Transitioning to cancelled/rejected after being received: Revert stock
            if ($wasReceived && in_array($newStatus, [SaleReturn::STATUS_CANCELLED, SaleReturn::STATUS_REJECTED])) {
                $saleReturn->load('items');
                foreach ($saleReturn->items as $item) {
                    if ($item->restock && $locationId) {
                        $balance = StockBalance::where('stock_location_id', $locationId)
                            ->where('product_variant_id', $item->product_variant_id)
                            ->first();
                        if ($balance) {
                            $balance->decrement('quantity_on_hand', $item->quantity);
                        }

                        $variant = ProductVariant::find($item->product_variant_id);
                        if ($variant && $variant->product_id) {
                            Product::where('id', $variant->product_id)->decrement('quantity', $item->quantity);
                        }
                    }
                }
                $saleReturn->received_at = null;
            }

            $saleReturn->fill($validated);
            if ($locationId) {
                $saleReturn->restock_to_location_id = $locationId;
            }
            $saleReturn->save();

            if ($saleReturn->sale) {
                $this->syncSaleStatus($saleReturn->sale);
            }
        });

        return response()->json([
            'message' => 'Sale return updated successfully.',
            'return'  => $saleReturn->fresh(['items', 'sale', 'refunds', 'customer']),
        ]);
    }

    /**
     * DELETE /api/sale-returns/{saleReturn}
     * Delete draft or cancelled sale return (Guarded against refund records and non-draft status)
     */
    public function destroy(SaleReturn $saleReturn): JsonResponse
    {
        if ($saleReturn->refunds()->exists()) {
            return response()->json([
                'message' => 'Cannot delete sale return with existing refund disbursements. Cancel or reverse refunds first.',
            ], 409);
        }

        if (!in_array($saleReturn->status, [SaleReturn::STATUS_REQUESTED, SaleReturn::STATUS_CANCELLED])) {
            return response()->json([
                'message' => "Cannot delete sale return with status '{$saleReturn->status}'. Only 'requested' or 'cancelled' returns may be deleted.",
            ], 409);
        }

        DB::transaction(function () use ($saleReturn) {
            $sale = $saleReturn->sale;
            $saleReturn->items()->delete();
            $saleReturn->delete();

            if ($sale) {
                $this->syncSaleStatus($sale);
            }
        });

        return response()->json([
            'message' => 'Sale return deleted successfully.',
        ]);
    }

    /**
     * Helper to recalculate and synchronize the parent sale's return status
     */
    protected function syncSaleStatus(Sale $sale): void
    {
        $sale->load('items');
        $totalOriginalQuantity = (float) $sale->items->sum('quantity');

        $totalReturnedQuantity = (float) SaleReturnItem::whereIn('sale_item_id', $sale->items->pluck('id'))
            ->whereHas('saleReturn', function ($q) {
                $q->whereNotIn('status', [SaleReturn::STATUS_REJECTED, SaleReturn::STATUS_CANCELLED]);
            })
            ->sum('quantity');

        if ($totalReturnedQuantity >= $totalOriginalQuantity && $totalOriginalQuantity > 0) {
            $sale->update(['status' => Sale::STATUS_RETURNED]);
        } elseif ($totalReturnedQuantity > 0) {
            $sale->update(['status' => Sale::STATUS_PARTIALLY_RETURNED]);
        }
    }
}
