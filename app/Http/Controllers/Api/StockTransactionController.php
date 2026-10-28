<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockBalance;
use App\Models\StockTransaction;
use App\Models\StockTransactionItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StockTransactionController extends Controller
{
    /**
     * GET /api/stock-transactions
     * Query immutable audit history of inventory movements
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockTransaction::with([
            'createdBy:id,name',
            'postedBy:id,name',
            'items.productVariant.product:id,name,sku',
            'items.stockLocation:id,code,name',
        ])->latest('occurred_at');

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->query('transaction_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate());
    }

    /**
     * GET /api/stock-transactions/{stockTransaction}
     * Get single stock transaction details
     */
    public function show(StockTransaction $stockTransaction): JsonResponse
    {
        return response()->json($stockTransaction->load([
            'createdBy:id,name,email',
            'postedBy:id,name,email',
            'items.productVariant.product',
            'items.stockLocation.store',
        ]));
    }

    /**
     * POST /api/stock-transactions
     * Manually record an audited inventory transaction (e.g. opening balance)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_type'               => ['required', 'string', 'max:40'],
            'notes'                          => ['nullable', 'string'],
            'items'                          => ['required', 'array', 'min:1'],
            'items.*.stock_location_id'      => ['required', 'exists:stock_locations,id'],
            'items.*.product_variant_id'     => ['required', 'exists:product_variants,id'],
            'items.*.quantity_delta'         => ['required', 'numeric'],
            'items.*.unit_cost'              => ['nullable', 'numeric', 'min:0'],
        ]);

        $tx = DB::transaction(function () use ($request, $validated) {
            $stockTx = StockTransaction::create([
                'transaction_number' => 'STX-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'transaction_type'   => $validated['transaction_type'],
                'status'             => StockTransaction::STATUS_POSTED,
                'occurred_at'        => now(),
                'created_by'         => $request->user()->id,
                'posted_by'          => $request->user()->id,
                'posted_at'          => now(),
                'notes'              => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                // Fetch or initialize StockBalance
                $balance = StockBalance::firstOrCreate(
                    [
                        'stock_location_id'  => $item['stock_location_id'],
                        'product_variant_id' => $item['product_variant_id'],
                    ],
                    ['quantity_on_hand' => 0.000]
                );

                $beforeQty = (float) $balance->quantity_on_hand;
                $deltaQty  = (float) $item['quantity_delta'];
                $afterQty  = $beforeQty + $deltaQty;

                $balance->update(['quantity_on_hand' => $afterQty]);

                StockTransactionItem::create([
                    'stock_transaction_id' => $stockTx->id,
                    'stock_location_id'    => $item['stock_location_id'],
                    'product_variant_id'   => $item['product_variant_id'],
                    'quantity_delta'       => $deltaQty,
                    'quantity_before'      => $beforeQty,
                    'quantity_after'       => $afterQty,
                    'unit_cost'            => $item['unit_cost'] ?? 0.00,
                ]);
            }

            return $stockTx;
        });

        return response()->json([
            'message'           => 'Stock transaction logged successfully.',
            'stock_transaction' => $tx->load(['items.productVariant.product', 'items.stockLocation']),
        ], 201);
    }
}
