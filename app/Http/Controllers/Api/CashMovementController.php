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
        $validated = $request->validate([
            'cashier_shift_id' => ['required', 'exists:cashier_shifts,id'],
            'movement_type'    => ['required', 'string', 'in:cash_in,cash_out'],
            'amount'           => ['required', 'numeric', 'min:0.01'],
            'reason'           => ['required', 'string', 'max:255'],
        ]);

        $movement = DB::transaction(function () use ($request, $validated) {
            $shift = CashierShift::lockForUpdate()->findOrFail($validated['cashier_shift_id']);

            if ($shift->status !== CashierShift::STATUS_OPEN) {
                throw ValidationException::withMessages([
                    'cashier_shift_id' => ["Cannot record cash movements for shift #{$shift->id} because it is already '{$shift->status}'."],
                ]);
            }

            $amount = (float) $validated['amount'];

            $movement = CashMovement::create([
                'cashier_shift_id' => $shift->id,
                'movement_type'    => $validated['movement_type'],
                'amount'           => $amount,
                'reason'           => $validated['reason'],
                'recorded_by'      => $request->user()?->id,
                'occurred_at'      => now(),
            ]);

            // Dynamically adjust expected cash in drawer
            if ($validated['movement_type'] === CashMovement::TYPE_CASH_IN) {
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
