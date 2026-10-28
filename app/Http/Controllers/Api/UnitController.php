<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UnitController extends Controller
{
    /**
     * GET /api/units
     * List units of measurement (e.g., pcs, box, kg, meter)
     */
    public function index(): JsonResponse
    {
        return response()->json(Unit::query()->latest()->paginate());
    }

    /**
     * GET /api/units/{unit}
     * Get single unit details
     */
    public function show(Unit $unit): JsonResponse
    {
        return response()->json($unit);
    }

    /**
     * POST /api/units
     * Create a new unit of measurement
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                    => ['required', 'string', 'max:80', 'unique:units,name'],
            'abbreviation'            => ['required', 'string', 'max:20', 'unique:units,abbreviation'],
            'allows_decimal_quantity' => ['nullable', 'boolean'],
        ]);

        $unit = Unit::create([
            'name'                    => $validated['name'],
            'abbreviation'            => $validated['abbreviation'],
            'allows_decimal_quantity' => $validated['allows_decimal_quantity'] ?? false,
        ]);

        return response()->json([
            'message' => 'Unit of measurement created successfully.',
            'unit'    => $unit,
        ], 201);
    }

    /**
     * PUT/PATCH /api/units/{unit}
     * Update an existing unit of measurement
     */
    public function update(Request $request, Unit $unit): JsonResponse
    {
        $validated = $request->validate([
            'name'                    => ['sometimes', 'required', 'string', 'max:80', Rule::unique('units', 'name')->ignore($unit)],
            'abbreviation'            => ['sometimes', 'required', 'string', 'max:20', Rule::unique('units', 'abbreviation')->ignore($unit)],
            'allows_decimal_quantity' => ['sometimes', 'boolean'],
        ]);

        $unit->update($validated);

        return response()->json([
            'message' => 'Unit updated successfully.',
            'unit'    => $unit->refresh(),
        ]);
    }

    /**
     * DELETE /api/units/{unit}
     * Delete unit with safety check for linked products
     */
    public function destroy(Unit $unit): JsonResponse
    {
        if ($unit->products()->exists()) {
            return response()->json([
                'message' => 'This unit cannot be deleted while it is assigned to existing products.',
            ], 409);
        }

        $unit->delete();

        return response()->json([
            'message' => 'Unit deleted successfully.',
        ], 200);
    }
}
