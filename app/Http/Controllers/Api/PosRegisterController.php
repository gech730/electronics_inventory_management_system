<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\PosRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosRegisterController extends Controller
{
    /**
     * Display a listing of POS registers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PosRegister::query()->with('store:id,code,name');

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $registers = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($registers);
    }

    /**
     * Display the specified POS register details.
     */
    public function show(PosRegister $posRegister): JsonResponse
    {
        $posRegister->load([
            'store',
            'cashierShifts' => fn ($q) => $q->latest()->take(5)->with('openedBy:id,name'),
        ]);

        return response()->json($posRegister);
    }

    /**
     * Store a newly created POS register.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id'  => ['required', 'exists:stores,id'],
            'code'      => ['required', 'string', 'max:50', 'unique:pos_registers,code'],
            'name'      => ['required', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $register = PosRegister::create([
            'store_id'  => $validated['store_id'],
            'code'      => strtoupper($validated['code']),
            'name'      => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message'      => 'POS Register created successfully.',
            'pos_register' => $register->load('store'),
        ], 201);
    }

    /**
     * Update the specified POS register.
     */
    public function update(Request $request, PosRegister $posRegister): JsonResponse
    {
        $validated = $request->validate([
            'store_id'  => ['sometimes', 'exists:stores,id'],
            'code'      => ['sometimes', 'string', 'max:50', 'unique:pos_registers,code,' . $posRegister->id],
            'name'      => ['sometimes', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $posRegister->update($validated);

        return response()->json([
            'message'      => 'POS Register updated successfully.',
            'pos_register' => $posRegister->fresh('store'),
        ]);
    }

    /**
     * Remove the specified POS register with shift integrity guard.
     */
    public function destroy(PosRegister $posRegister): JsonResponse
    {
        $hasShifts = CashierShift::where('pos_register_id', $posRegister->id)->exists();

        if ($hasShifts) {
            return response()->json([
                'message' => 'Cannot delete POS register with associated shift history. Deactivate the register instead.',
            ], 409);
        }

        $posRegister->delete();

        return response()->json([
            'message' => 'POS Register deleted successfully.',
        ]);
    }
}
