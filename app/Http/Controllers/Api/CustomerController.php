<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    /**
     * Display a listing of customers with optional filters and search.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query()->with(['defaultAddress', 'addresses']);

        if ($request->filled('customer_type')) {
            $query->where('customer_type', $request->customer_type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('customer_code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $customers = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($customers);
    }

    /**
     * Display the specified customer profile.
     */
    public function show(Customer $customer): JsonResponse
    {
        $customer->load(['addresses', 'defaultAddress', 'user:id,name,email']);

        $recentOrders = Order::query()
            ->where('customer_id', $customer->id)
            ->latest()
            ->take(5)
            ->get(['id', 'order_number', 'status', 'grand_total', 'created_at']);

        return response()->json([
            'customer' => $customer,
            'recent_orders' => $recentOrders,
        ]);
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_code'       => ['nullable', 'string', 'max:40', 'unique:customers,customer_code'],
            'customer_type'       => ['nullable', 'string', 'in:individual,corporate'],
            'display_name'        => ['required', 'string', 'max:180'],
            'phone'               => ['nullable', 'string', 'max:30'],
            'email'               => ['nullable', 'email', 'max:255'],
            'tax_number'          => ['nullable', 'string', 'max:80'],
            'credit_limit'        => ['nullable', 'numeric', 'min:0'],
            'default_credit_days' => ['nullable', 'integer', 'min:0'],
            'is_active'           => ['nullable', 'boolean'],
            'notes'               => ['nullable', 'string'],
            'user_id'             => ['nullable', 'exists:users,id', 'unique:customers,user_id'],

            // Optional embedded initial address
            'address'                      => ['nullable', 'array'],
            'address.label'                => ['nullable', 'string', 'max:60'],
            'address.address_type'         => ['nullable', 'string', 'in:billing,shipping,both'],
            'address.recipient_name'       => ['nullable', 'string', 'max:180'],
            'address.phone'                => ['nullable', 'string', 'max:30'],
            'address.country_code'         => ['nullable', 'string', 'size:2'],
            'address.region'               => ['nullable', 'string', 'max:100'],
            'address.city'                 => ['nullable', 'string', 'max:100'],
            'address.sub_city'             => ['nullable', 'string', 'max:100'],
            'address.woreda'               => ['nullable', 'string', 'max:100'],
            'address.address_line'         => ['nullable', 'string', 'max:255'],
            'address.landmark'             => ['nullable', 'string', 'max:255'],
            'address.postal_code'          => ['nullable', 'string', 'max:30'],
            'address.is_default'           => ['nullable', 'boolean'],
        ]);

        $customer = DB::transaction(function () use ($validated) {
            $customerCode = $validated['customer_code'] ?? ('CUST-' . strtoupper(Str::random(8)));

            $customer = Customer::create([
                'customer_code'       => $customerCode,
                'customer_type'       => $validated['customer_type'] ?? Customer::TYPE_INDIVIDUAL,
                'display_name'        => $validated['display_name'],
                'phone'               => $validated['phone'] ?? null,
                'email'               => $validated['email'] ?? null,
                'tax_number'          => $validated['tax_number'] ?? null,
                'credit_limit'        => $validated['credit_limit'] ?? 0.00,
                'default_credit_days' => $validated['default_credit_days'] ?? 0,
                'is_active'           => $validated['is_active'] ?? true,
                'notes'               => $validated['notes'] ?? null,
                'user_id'             => $validated['user_id'] ?? null,
            ]);

            if (!empty($validated['address'])) {
                $addrData = $validated['address'];
                $addrData['customer_id'] = $customer->id;
                $addrData['is_default'] = $addrData['is_default'] ?? true;
                CustomerAddress::create($addrData);
            }

            return $customer;
        });

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => $customer->load(['addresses', 'defaultAddress']),
        ], 201);
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'customer_code'       => ['sometimes', 'string', 'max:40', 'unique:customers,customer_code,' . $customer->id],
            'customer_type'       => ['sometimes', 'string', 'in:individual,corporate'],
            'display_name'        => ['sometimes', 'string', 'max:180'],
            'phone'               => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'               => ['sometimes', 'nullable', 'email', 'max:255'],
            'tax_number'          => ['sometimes', 'nullable', 'string', 'max:80'],
            'credit_limit'        => ['sometimes', 'numeric', 'min:0'],
            'default_credit_days' => ['sometimes', 'integer', 'min:0'],
            'is_active'           => ['sometimes', 'boolean'],
            'notes'               => ['sometimes', 'nullable', 'string'],
            'user_id'             => ['sometimes', 'nullable', 'exists:users,id', 'unique:customers,user_id,' . $customer->id],
        ]);

        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'customer' => $customer->fresh(['addresses', 'defaultAddress']),
        ]);
    }

    /**
     * Remove the specified customer from storage with order integrity guard.
     */
    public function destroy(Customer $customer): JsonResponse
    {
        $hasOrders = Order::where('customer_id', $customer->id)->exists();

        if ($hasOrders) {
            return response()->json([
                'message' => 'Cannot delete customer with associated order history. Deactivate the customer instead.',
            ], 409);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    /**
     * Add a new address for the customer.
     */
    public function storeAddress(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'label'          => ['nullable', 'string', 'max:60'],
            'address_type'   => ['nullable', 'string', 'in:billing,shipping,both'],
            'recipient_name' => ['nullable', 'string', 'max:180'],
            'phone'          => ['nullable', 'string', 'max:30'],
            'country_code'   => ['nullable', 'string', 'size:2'],
            'region'         => ['nullable', 'string', 'max:100'],
            'city'           => ['nullable', 'string', 'max:100'],
            'sub_city'       => ['nullable', 'string', 'max:100'],
            'woreda'         => ['nullable', 'string', 'max:100'],
            'address_line'   => ['nullable', 'string', 'max:255'],
            'landmark'       => ['nullable', 'string', 'max:255'],
            'postal_code'    => ['nullable', 'string', 'max:30'],
            'is_default'     => ['nullable', 'boolean'],
        ]);

        $address = DB::transaction(function () use ($customer, $validated) {
            if (!empty($validated['is_default'])) {
                CustomerAddress::where('customer_id', $customer->id)->update(['is_default' => false]);
            }

            $validated['customer_id'] = $customer->id;
            return CustomerAddress::create($validated);
        });

        return response()->json([
            'message' => 'Customer address added successfully.',
            'address' => $address,
        ], 201);
    }

    /**
     * Update an existing address for the customer.
     */
    public function updateAddress(Request $request, Customer $customer, CustomerAddress $address): JsonResponse
    {
        if ($address->customer_id !== $customer->id) {
            return response()->json(['message' => 'Address does not belong to this customer.'], 404);
        }

        $validated = $request->validate([
            'label'          => ['sometimes', 'nullable', 'string', 'max:60'],
            'address_type'   => ['sometimes', 'string', 'in:billing,shipping,both'],
            'recipient_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'phone'          => ['sometimes', 'nullable', 'string', 'max:30'],
            'country_code'   => ['sometimes', 'string', 'size:2'],
            'region'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'city'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'sub_city'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'woreda'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'address_line'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'landmark'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code'    => ['sometimes', 'nullable', 'string', 'max:30'],
            'is_default'     => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($customer, $address, $validated) {
            if (!empty($validated['is_default'])) {
                CustomerAddress::where('customer_id', $customer->id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }
            $address->update($validated);
        });

        return response()->json([
            'message' => 'Customer address updated successfully.',
            'address' => $address->fresh(),
        ]);
    }

    /**
     * Remove an address from customer profile.
     */
    public function destroyAddress(Customer $customer, CustomerAddress $address): JsonResponse
    {
        if ($address->customer_id !== $customer->id) {
            return response()->json(['message' => 'Address does not belong to this customer.'], 404);
        }

        $address->delete();

        return response()->json([
            'message' => 'Customer address removed successfully.',
        ]);
    }
}
