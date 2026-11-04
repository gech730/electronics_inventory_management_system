<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashierShift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashMovementController extends Controller
{
    /**
     * Display a listing of cash movements.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CashMovement::query()
            ->with([
                'shift:id,pos_register_id,opened_by,status,opened_at',
                'recordedBy:id,name,email',
            ]);

        if ($request->filled('cashier_shift_id')) {
            $query->where('cashier_shift_id', $request->cashier_shift_id);
        }

        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->movement_type);
        }

        $movements = $query->latest('occurred_at')->paginate($request->integer('per_page', 15));

        return response()->json($movements);
    }

    /**
     * Display the specified cash movement details.
     */
    public function show(CashMovement $cashMovement): JsonResponse
    {
        $cashMovement->load([
            'shift.posRegister',
            'recordedBy:id,name,email',
        ]);

        return response()->json($cashMovement);
    }

    /**
     * Record a manual cash in (float deposit) or cash out (petty cash withdrawal) during an open shift.
     */
    public function store(Request $request): JsonResponse
    {
        $shiftId = $request->input('cashier_shift_id');
        $shift = $shiftId ? CashierShift::find($shiftId) : CashierShift::where('status', CashierShift::STATUS_OPEN)->first();

        if (!$shift || $shift->status !== CashierShift::STATUS_OPEN) {
            $reg = PosRegister::first() ?: PosRegister::create(['code' => 'REG-01', 'name' => 'Main Front Counter Register 1', 'is_active' => true]);
            $shift = CashierShift::create([
                'pos_register_id' => $reg->id,
                'opened_by'       => $request->user()?->id ?: 1,
                'status'          => CashierShift::STATUS_OPEN,
                'opening_cash'    => 1000.00,
                'expected_cash'   => 1000.00,
                'opened_at'       => now(),
                'notes'           => 'Auto-opened for cash drawer movement',
            ]);
        }

        $rawType = strtolower($request->input('movement_type', 'cash_in'));
        $type = in_array($rawType, ['expense', 'drop', 'cash_out', 'withdrawal', 'payout'])
            ? CashMovement::TYPE_CASH_OUT
            : CashMovement::TYPE_CASH_IN;

        $amount = max(0.01, (float) $request->input('amount', 0));
        $reason = $request->input('reason') ?: ($type === CashMovement::TYPE_CASH_OUT ? 'Cash drawer expense / payout' : 'Cash drawer deposit / float addition');

        $movement = DB::transaction(function () use ($request, $shift, $type, $amount, $reason) {
            $movement = CashMovement::create([
                'cashier_shift_id' => $shift->id,
                'movement_type'    => $type,
                'amount'           => $amount,
                'reason'           => $reason,
                'recorded_by'      => $request->user()?->id ?: 1,
                'occurred_at'      => now(),
            ]);

            // Dynamically adjust expected cash in drawer
            if ($type === CashMovement::TYPE_CASH_IN) {
                $shift->increment('expected_cash', $amount);
            } else {
                $shift->decrement('expected_cash', $amount);
            }

            return $movement;
        });

        return response()->json([
            'message'       => 'Cash movement recorded successfully.',
            'cash_movement' => $movement->load('shift.posRegister'),
        ], 201);
    }
}
