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

    public function show(Request $request, Sale $sale): JsonResponse
    {
        abort_unless($sale->user_id === $request->user()->id, 404);

        return response()->json($sale->only(['id', 'total_amount', 'created_at']));
    }
}