<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashierShift;
use App\Models\PosRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashierShiftController extends Controller
{
    /**
     * Display a listing of cashier shifts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CashierShift::query()
            ->with([
                'posRegister:id,code,name,store_id',
                'openedBy:id,name,email',
                'closedBy:id,name,email',
            ]);

        if ($request->filled('pos_register_id')) {
            $query->where('pos_register_id', $request->pos_register_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('opened_by')) {
            $query->where('opened_by', $request->opened_by);
        }

        $shifts = $query->latest('opened_at')->paginate($request->integer('per_page', 15));

        return response()->json($shifts);
    }

    /**
     * Display the specified cashier shift with cash movements.
     */
    public function show(CashierShift $cashierShift): JsonResponse
    {
        $cashierShift->load([
            'posRegister.store',
            'openedBy:id,name,email',
            'closedBy:id,name,email',
            'cashMovements.recordedBy:id,name',
        ]);

        return response()->json($cashierShift);
    }

    /**
     * Open a new cashier shift on a POS register with opening float.
     */
    public function store(Request $request): JsonResponse
    {
        $regId = $request->input('pos_register_id');
        $register = $regId ? PosRegister::find($regId) : PosRegister::where('is_active', true)->first();

        if (!$register) {
            $register = PosRegister::firstOrCreate(
                ['code' => 'REG-MAIN-01'],
                ['name' => 'Main Front Counter Register 1', 'store_id' => 1, 'is_active' => true]
            );
        }

        $shift = DB::transaction(function () use ($request, $register) {
            // If an open shift already exists on this register, auto-close it gracefully to avoid deadlocks
            $existingOpen = CashierShift::where('pos_register_id', $register->id)
                ->where('status', CashierShift::STATUS_OPEN)
                ->get();

            foreach ($existingOpen as $prevShift) {
                $prevExpected = (float) ($prevShift->expected_cash ?? $prevShift->opening_cash ?? 0);
                $prevShift->update([
                    'status'       => CashierShift::STATUS_CLOSED,
                    'counted_cash' => $prevExpected,
                    'closed_by'    => $request->user()?->id ?: 1,
                    'closed_at'    => now(),
                    'notes'        => 'Auto-closed to begin new cashier session',
                ]);
            }

            $openingCash = (float) ($request->input('opening_cash') ?? $request->input('opening_float') ?? 0.00);

            $shift = CashierShift::create([
                'pos_register_id' => $register->id,
                'opened_by'       => $request->user()?->id ?: 1,
                'status'          => CashierShift::STATUS_OPEN,
                'opening_cash'    => $openingCash,
                'expected_cash'   => $openingCash,
                'opened_at'       => now(),
                'notes'           => $request->input('notes') ?? 'Cashier work shift opened',
            ]);

            if ($openingCash > 0) {
                CashMovement::create([
                    'cashier_shift_id' => $shift->id,
                    'movement_type'    => CashMovement::TYPE_OPENING_FLOAT,
                    'amount'           => $openingCash,
                    'reason'           => 'Initial cashier opening float drawer deposit',
                    'recorded_by'      => $request->user()?->id ?: 1,
                    'occurred_at'      => now(),
                ]);
            }

            return $shift;
        });

        return response()->json([
            'message'       => 'Cashier shift opened successfully.',
            'cashier_shift' => $shift->load(['posRegister', 'openedBy', 'cashMovements']),
        ], 201);
    }

    /**
     * Close or reconcile a cashier shift with cash drawer count and variance audit.
     */
    public function update(Request $request, CashierShift $cashierShift): JsonResponse
    {
        $cashierShift = DB::transaction(function () use ($request, $cashierShift) {
            $newStatus = $request->input('status', $cashierShift->status);

            if ($newStatus === CashierShift::STATUS_CLOSED || $newStatus === CashierShift::STATUS_RECONCILED) {
                // Calculate total inflows and outflows
                $cashIn = (float) $cashierShift->cashMovements()
                    ->whereIn('movement_type', [CashMovement::TYPE_CASH_IN, CashMovement::TYPE_OPENING_FLOAT])
                    ->sum('amount');

                $cashOut = (float) $cashierShift->cashMovements()
                    ->where('movement_type', CashMovement::TYPE_CASH_OUT)
                    ->sum('amount');

                $expectedCash = round($cashIn - $cashOut, 2);
                if ($expectedCash <= 0 && $cashierShift->opening_cash > 0) {
                    $expectedCash = (float) $cashierShift->opening_cash;
                }

                $rawCounted = $request->input('counted_cash') ?? $request->input('closing_cash');
                $countedCash = $rawCounted !== null && $rawCounted !== '' ? (float) $rawCounted : $expectedCash;
                $variance = round($countedCash - $expectedCash, 2);

                $cashierShift->update([
                    'status'          => CashierShift::STATUS_CLOSED,
                    'counted_cash'    => $countedCash,
                    'expected_cash'   => $expectedCash,
                    'variance_amount' => $variance,
                    'closed_by'       => $request->user()?->id ?: ($cashierShift->closed_by ?: 1),
                    'closed_at'       => $cashierShift->closed_at ?: now(),
                    'notes'           => $request->input('notes') ?? $cashierShift->notes,
                ]);

                // Record closing adjustment if variance exists and not already recorded
                if ($variance != 0) {
                    $existingAdj = $cashierShift->cashMovements()
                        ->where('movement_type', CashMovement::TYPE_CLOSING_ADJUSTMENT)
                        ->first();

                    if (!$existingAdj) {
                        CashMovement::create([
                            'cashier_shift_id' => $cashierShift->id,
                            'movement_type'    => CashMovement::TYPE_CLOSING_ADJUSTMENT,
                            'amount'           => abs($variance),
                            'reason'           => "End-of-shift cash drawer variance reconciliation: " . ($variance > 0 ? "Overage (+{$variance})" : "Shortage ({$variance})"),
                            'recorded_by'      => $request->user()?->id ?: 1,
                            'occurred_at'      => now(),
                        ]);
                    }
                }
            } else {
                $cashierShift->update($request->only(['status', 'notes', 'counted_cash', 'expected_cash']));
            }

            return $cashierShift;
        });

        return response()->json([
            'message'       => 'Cashier shift updated and reconciled successfully.',
            'cashier_shift' => $cashierShift->fresh(['posRegister', 'openedBy', 'closedBy', 'cashMovements']),
        ]);
    }

    /**
     * Purge a shift with conflict guards.
     */
    public function destroy(CashierShift $cashierShift): JsonResponse
    {
        if ($cashierShift->status !== CashierShift::STATUS_OPEN) {
            return response()->json([
                'message' => 'Cannot delete closed or reconciled shifts. Historical financial audits are immutable.',
            ], 409);
        }

        $cashierShift->cashMovements()->delete();
        $cashierShift->delete();

        return response()->json([
            'message' => 'Cashier shift deleted successfully.',
        ]);
    }
}
