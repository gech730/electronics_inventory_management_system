<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sales = Sale::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate()
            ->through(fn (Sale $sale) => $sale->only(['id', 'total_amount', 'created_at']));

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'total_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $saleData = [
            'user_id' => $request->user()->id,
            'total_amount' => $validated['total_amount'],
        ];

        if (Schema::hasColumn('sales', 'cashier_id')) {
            $saleData['cashier_id'] = $request->user()->id;
        }
        if (Schema::hasColumn('sales', 'grand_total')) {
            $saleData['grand_total'] = $validated['total_amount'];
        }
        if (Schema::hasColumn('sales', 'sale_number')) {
            $saleData['sale_number'] = 'SALE-' . strtoupper(uniqid());
        }

        $sale = Sale::create($saleData);

        return response()->json([
            'message' => 'Sale recorded successfully.',
            'sale' => $sale->only(['id', 'total_amount', 'created_at']),
        ], 201);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        abort_unless($sale->user_id === $request->user()->id, 404);

        return response()->json($sale->only(['id', 'total_amount', 'created_at']));
    }
}