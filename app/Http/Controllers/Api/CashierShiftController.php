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
        $validated = $request->validate([
            'pos_register_id' => ['required', 'exists:pos_registers,id'],
            'opening_cash'    => ['nullable', 'numeric', 'min:0'],
            'notes'           => ['nullable', 'string'],
        ]);

        $shift = DB::transaction(function () use ($request, $validated) {
            $register = PosRegister::lockForUpdate()->findOrFail($validated['pos_register_id']);

            if (!$register->is_active) {
                throw ValidationException::withMessages([
                    'pos_register_id' => ['Cannot open a shift on an inactive POS register.'],
                ]);
            }

            $alreadyOpen = CashierShift::where('pos_register_id', $register->id)
                ->where('status', CashierShift::STATUS_OPEN)
                ->exists();

            if ($alreadyOpen) {
                throw ValidationException::withMessages([
                    'pos_register_id' => ["POS register '{$register->name}' already has an active open shift. Close the existing shift first."],
                ]);
            }

            $openingCash = (float) ($validated['opening_cash'] ?? 0.00);

            $shift = CashierShift::create([
                'pos_register_id' => $register->id,
                'opened_by'       => $request->user()?->id,
                'status'          => CashierShift::STATUS_OPEN,
                'opening_cash'    => $openingCash,
                'expected_cash'   => $openingCash,
                'opened_at'       => now(),
                'notes'           => $validated['notes'] ?? null,
            ]);

            if ($openingCash > 0) {
                CashMovement::create([
                    'cashier_shift_id' => $shift->id,
                    'movement_type'    => CashMovement::TYPE_OPENING_FLOAT,
                    'amount'           => $openingCash,
                    'reason'           => 'Initial cashier opening float drawer deposit',
                    'recorded_by'      => $request->user()?->id,
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
        $validated = $request->validate([
            'status'       => ['sometimes', 'string', 'in:open,closed,reconciled'],
            'counted_cash' => ['required_if:status,closed', 'nullable', 'numeric', 'min:0'],
            'notes'        => ['sometimes', 'nullable', 'string'],
        ]);

        $cashierShift = DB::transaction(function () use ($request, $cashierShift, $validated) {
            $newStatus = $validated['status'] ?? $cashierShift->status;

            if ($newStatus === CashierShift::STATUS_CLOSED && $cashierShift->status === CashierShift::STATUS_OPEN) {
                $countedCash = (float) $validated['counted_cash'];

                // Calculate total inflows and outflows
                $cashIn = (float) $cashierShift->cashMovements()
                    ->whereIn('movement_type', [CashMovement::TYPE_CASH_IN, CashMovement::TYPE_OPENING_FLOAT])
                    ->sum('amount');

                $cashOut = (float) $cashierShift->cashMovements()
                    ->where('movement_type', CashMovement::TYPE_CASH_OUT)
                    ->sum('amount');

                $expectedCash = round($cashIn - $cashOut, 2);
                $variance = round($countedCash - $expectedCash, 2);

                $cashierShift->update([
                    'status'          => CashierShift::STATUS_CLOSED,
                    'counted_cash'    => $countedCash,
                    'expected_cash'   => $expectedCash,
                    'variance_amount' => $variance,
                    'closed_by'       => $request->user()?->id,
                    'closed_at'       => now(),
                    'notes'           => $validated['notes'] ?? $cashierShift->notes,
                ]);

                // Record closing adjustment if variance exists
                if ($variance != 0) {
                    CashMovement::create([
                        'cashier_shift_id' => $cashierShift->id,
                        'movement_type'    => CashMovement::TYPE_CLOSING_ADJUSTMENT,
                        'amount'           => abs($variance),
                        'reason'           => "End-of-shift cash drawer variance reconciliation: " . ($variance > 0 ? "Overage (+{$variance})" : "Shortage ({$variance})"),
                        'recorded_by'      => $request->user()?->id,
                        'occurred_at'      => now(),
                    ]);
                }
            } else {
                $cashierShift->update($validated);
            }

            return $cashierShift;
        });

        return response()->json([
            'message'       => 'Cashier shift updated successfully.',
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
