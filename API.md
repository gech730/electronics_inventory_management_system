# Electronics Inventory Management System — API Reference Guide

A complete, role-based guide for all implemented API endpoints, detailing **exact required headers**, **request body specifications**, **field rules**, and **response schemas**.

---

## 📌 Global HTTP Headers Guide

Every request sent to this API conforms to standard HTTP header requirements:

| Header Name | Required For | Expected Value | Purpose |
| :--- | :--- | :--- | :--- |
| `Accept` | **All Endpoints** | `application/json` | Enforces JSON responses from Laravel, including validation and auth error exceptions. |
| `Content-Type` | **Endpoints requiring a Body** | `application/json` | Tells the server that the request payload is formatted as a JSON object. |
| `Authorization` | **All Protected Endpoints** | `Bearer <token>` | Passes the Laravel Sanctum API authentication token obtained from `/api/login`. |

> [!NOTE]
> - If an endpoint has **`Body Required: ❌ NO`**, **do NOT** send a request body or the `Content-Type` header.
> - If an endpoint is **Public**, **do NOT** send the `Authorization` header.

---

## 🧭 Master Endpoint & Header/Body Guide Matrix

All endpoints are hosted at base URL: `http://localhost:8000/api`

| # | HTTP Method | Endpoint URL | Role / Access | Headers Required | Body Required? | Body Format / Summary |
| :- | :--- | :--- | :--- | :--- | :-: | :--- |
| **PUBLIC ENDPOINTS (No Token Needed)** |
| 1 | `POST` | `/api/login` | **Public** | `Accept`, `Content-Type` | **✅ YES** | `{ email, password }` |
| 2 | `GET` | `/api/products` | **Public** | `Accept` | ❌ NO | None (Paginated catalog with brand & category) |
| 3 | `GET` | `/api/products/{id}` | **Public** | `Accept` | ❌ NO | None (Single product details) |
| 4 | `GET` | `/api/categories` | **Public** | `Accept` | ❌ NO | None (Paginated category list) |
| 5 | `GET` | `/api/categories/{id}` | **Public** | `Accept` | ❌ NO | None (Single category details) |
| 6 | `GET` | `/api/brands` | **Public** | `Accept` | ❌ NO | None (Paginated brands with product counts) |
| 7 | `GET` | `/api/brands/{id}` | **Public** | `Accept` | ❌ NO | None (Brand details with eager products) |
| 8 | `GET` | `/api/units` | **Public** | `Accept` | ❌ NO | None (Units of measure list) |
| 9 | `GET` | `/api/units/{id}` | **Public** | `Accept` | ❌ NO | None (Single unit details) |
| 10 | `GET` | `/api/stores` | **Public** | `Accept` | ❌ NO | None (Stores list with location count) |
| 11 | `GET` | `/api/stores/{id}` | **Public** | `Accept` | ❌ NO | None (Single store with locations) |
| 12 | `GET` | `/api/stock-locations` | **Public** | `Accept` | ❌ NO | None (Stock locations queryable by store/type) |
| 13 | `GET` | `/api/stock-locations/{id}` | **Public** | `Accept` | ❌ NO | None (Stock location with store & balances) |
| 14 | `GET` | `/api/stock-balances` | **Public** | `Accept` | ❌ NO | None (Stock balances across stores & locations) |
| 15 | `GET` | `/api/stock-balances/{id}` | **Public** | `Accept` | ❌ NO | None (Single stock balance record) |
| 16 | `GET` | `/api/suppliers` | **Public** | `Accept` | ❌ NO | None (Directory of component & hardware vendors) |
| 17 | `GET` | `/api/suppliers/{id}` | **Public** | `Accept` | ❌ NO | None (Single supplier details with recent POs) |
| 18 | `GET` | `/api/purchase-orders` | **Public** | `Accept` | ❌ NO | None (Purchase orders queryable by supplier/status) |
| 19 | `GET` | `/api/purchase-orders/{id}`| **Public** | `Accept` | ❌ NO | None (Purchase order with line items & receipts) |
| 20 | `GET` | `/api/goods-receipts` | **Public** | `Accept` | ❌ NO | None (Inventory intake receipts log) |
| 21 | `GET` | `/api/goods-receipts/{id}` | **Public** | `Accept` | ❌ NO | None (Goods receipt with items & location) |
| 22 | `GET` | `/api/supplier-payments` | **Public** | `Accept` | ❌ NO | None (Supplier payables and settlement ledger) |
| 23 | `GET` | `/api/supplier-payments/{id}`| **Public**| `Accept` | ❌ NO | None (Single payment transaction details) |
| 24 | `GET` | `/api/stock-transfers` | **Public** | `Accept` | ❌ NO | None (Paginated stock transfers with origin/destination) |
| 25 | `GET` | `/api/stock-transfers/{id}` | **Public** | `Accept` | ❌ NO | None (Single transfer with line items) |
| 26 | `GET` | `/api/stock-adjustments` | **Public** | `Accept` | ❌ NO | None (Inventory cycle counts & reconciliation audits) |
| 27 | `GET` | `/api/stock-adjustments/{id}` | **Public** | `Accept` | ❌ NO | None (Single adjustment with audited items & variances) |
| 28 | `GET` | `/api/stock-transactions` | **Public** | `Accept` | ❌ NO | None (Immutable inventory audit trail ledger) |
| 29 | `GET` | `/api/stock-transactions/{id}` | **Public** | `Accept` | ❌ NO | None (Single stock transaction entry) |
| 30 | `GET` | `/api/customers` | **Public** | `Accept` | ❌ NO | None (Directory of individual and corporate customers) |
| 31 | `GET` | `/api/customers/{id}` | **Public** | `Accept` | ❌ NO | None (Customer profile with addresses & order history) |
| 32 | `GET` | `/api/orders` | **Public** | `Accept` | ❌ NO | None (Multi-channel orders filterable by channel/status) |
| 33 | `GET` | `/api/orders/{id}` | **Public** | `Accept` | ❌ NO | None (Order details with items, reservations, & shipments) |
| 34 | `GET` | `/api/shipments` | **Public** | `Accept` | ❌ NO | None (Logistics packages & courier delivery tracking) |
| 35 | `GET` | `/api/shipments/{id}` | **Public** | `Accept` | ❌ NO | None (Shipment details with dispatched items) |
| 36 | `GET` | `/api/pos-registers` | **Public** | `Accept` | ❌ NO | None (Register checkout terminals across retail stores) |
| 37 | `GET` | `/api/pos-registers/{id}` | **Public** | `Accept` | ❌ NO | None (Single register with shift history) |
| 38 | `GET` | `/api/cashier-shifts` | **Public** | `Accept` | ❌ NO | None (Cashier work sessions with cash reconciliation) |
| 39 | `GET` | `/api/cashier-shifts/{id}` | **Public** | `Accept` | ❌ NO | None (Shift details with opening float, counted cash, & variance) |
| 40 | `GET` | `/api/cash-movements` | **Public** | `Accept` | ❌ NO | None (Petty cash withdrawals & float replenishment log) |
| 41 | `GET` | `/api/cash-movements/{id}` | **Public** | `Accept` | ❌ NO | None (Single cash movement record) |
| 42 | `GET` | `/api/payment-methods` | **Public** | `Accept` | ❌ NO | None (Directory of supported payment tender channels) |
| 43 | `GET` | `/api/payment-methods/{id}` | **Public** | `Accept` | ❌ NO | None (Single payment method details) |
| 44 | `GET` | `/api/payments` | **Public** | `Accept` | ❌ NO | None (Customer payments and settlement transaction ledger) |
| 45 | `GET` | `/api/payments/{id}` | **Public** | `Accept` | ❌ NO | None (Payment record with sale invoice allocations) |
| 46 | `GET` | `/api/tax-rates` | **Public** | `Accept` | ❌ NO | None (National VAT and regional tax rate schedule) |
| 47 | `GET` | `/api/tax-rates/{id}` | **Public** | `Accept` | ❌ NO | None (Tax rate details with product variant count) |
| 48 | `GET` | `/api/sale-returns` | **Public** | `Accept` | ❌ NO | None (Paginated sales returns filterable by status/sale/customer) |
| 49 | `GET` | `/api/sale-returns/{id}` | **Public** | `Accept` | ❌ NO | None (Return details with line items & refunds) |
| 50 | `GET` | `/api/sale-refunds` | **Public** | `Accept` | ❌ NO | None (Paginated refunds ledger filterable by return/payment method) |
| 51 | `GET` | `/api/sale-refunds/{id}` | **Public** | `Accept` | ❌ NO | None (Single refund transaction record) |
| **COMMON AUTHENTICATED ENDPOINTS (Any Authenticated Role)** |
| 52 | `GET` | `/api/user` | **Any Role** (`admin`, `manager`, `cashier`, `storekeeper`) | `Accept`, `Authorization` | ❌ NO | None (Returns current user identity & role) |
| 53 | `POST` | `/api/logout` | **Any Role** (`admin`, `manager`, `cashier`, `storekeeper`) | `Accept`, `Authorization` | ❌ NO | None (Revokes current Sanctum Bearer token) |
| 54 | `POST` | `/api/cashier-shifts` | **Staff** (`admin`, `manager`, `cashier`) | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ pos_register_id, opening_cash?, notes? }` |
| 55 | `PUT/PATCH`| `/api/cashier-shifts/{id}` | **Staff** (`admin`, `manager`, `cashier`) | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status: 'closed', counted_cash, notes? }` |
| 56 | `POST` | `/api/cash-movements` | **Staff** (`admin`, `manager`, `cashier`) | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ cashier_shift_id, movement_type: 'cash_in'|'cash_out', amount, reason }` |
| 57 | `POST` | `/api/payments` | **Staff** (`admin`, `manager`, `cashier`) | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ payment_method_id, amount, customer_id?, transaction_reference?, allocations?: [...] }` |
| **ADMIN-ONLY ENDPOINTS (`role:admin`)** |
| 58 | `GET` | `/api/admin/users` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Paginated staff list) |
| 59 | `POST` | `/api/admin/users` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, email, password, password_confirmation, role }` |
| 60 | `POST` | `/api/categories` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, description }` |
| 61 | `PUT/PATCH`| `/api/categories/{id}` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, description? }` |
| 62 | `DELETE` | `/api/categories/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes category with product-conflict guard) |
| 63 | `DELETE` | `/api/products/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes product from catalog) |
| 64 | `DELETE` | `/api/brands/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes brand with product-conflict guard) |
| 65 | `DELETE` | `/api/units/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes unit with product-conflict guard) |
| 66 | `DELETE` | `/api/stores/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes store with location-conflict guard) |
| 67 | `DELETE` | `/api/stock-locations/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes location with on-hand stock guard) |
| 68 | `DELETE` | `/api/stock-balances/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes stock balance if on-hand is 0) |
| 69 | `DELETE` | `/api/suppliers/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes supplier with PO-conflict guard) |
| 70 | `DELETE` | `/api/purchase-orders/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes purchase order if draft or cancelled) |
| 71 | `DELETE` | `/api/stock-transfers/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes transfer if draft or cancelled) |
| 72 | `DELETE` | `/api/stock-adjustments/{id}`| `admin`| `Accept`, `Authorization` | ❌ NO | None (Deletes adjustment if draft or cancelled) |
| 73 | `DELETE` | `/api/customers/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes customer with order-conflict guard) |
| 74 | `DELETE` | `/api/orders/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes order if draft or cancelled) |
| 75 | `DELETE` | `/api/shipments/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes shipment if pending or cancelled) |
| 76 | `DELETE` | `/api/pos-registers/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes register with shift guard) |
| 77 | `DELETE` | `/api/cashier-shifts/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes open shift only) |
| 78 | `DELETE` | `/api/payment-methods/{id}`| `admin`| `Accept`, `Authorization` | ❌ NO | None (Deletes payment method with usage guard) |
| 79 | `DELETE` | `/api/payments/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes pending/failed payment only) |
| 80 | `DELETE` | `/api/tax-rates/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes tax rate with variant link guard) |
| 81 | `DELETE` | `/api/sale-returns/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes draft or cancelled return with refund guard) |
| 82 | `DELETE` | `/api/sale-refunds/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes pending or failed refund with succeeded guard) |
| **ADMIN & MANAGER ENDPOINTS (`role:admin,manager`)** |
| 83 | `POST` | `/api/products` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ category_id, sku, name, cost_price, selling_price, quantity, minimum_stock, brand_id?, ... }` |
| 84 | `PUT/PATCH`| `/api/products/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of product fields to update |
| 85 | `POST` | `/api/brands` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, description?, is_active? }` |
| 86 | `PUT/PATCH`| `/api/brands/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, description?, is_active? }` |
| 87 | `POST` | `/api/units` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, abbreviation, allows_decimal_quantity? }` |
| 88 | `PUT/PATCH`| `/api/units/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, abbreviation?, allows_decimal_quantity? }` |
| 89 | `POST` | `/api/stores` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code, name, phone?, email?, address?, is_active? }` |
| 90 | `PUT/PATCH`| `/api/stores/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code?, name?, phone?, email?, address?, is_active? }` |
| 91 | `POST` | `/api/stock-locations` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ store_id?, code, name, location_type, is_sellable?, is_active? }` |
| 92 | `PUT/PATCH`| `/api/stock-locations/{id}`| `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of stock location fields |
| 93 | `POST` | `/api/stock-balances` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ stock_location_id, product_variant_id, quantity_on_hand, quantity_reserved?, reorder_level? }` |
| 94 | `PUT/PATCH`| `/api/stock-balances/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ quantity_on_hand?, quantity_reserved?, reorder_level? }` |
| 95 | `POST` | `/api/suppliers` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_code, name, contact_person?, phone?, email?, tax_number?, address?, payment_terms_days? }` |
| 96 | `PUT/PATCH`| `/api/suppliers/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of supplier fields |
| 97 | `POST` | `/api/purchase-orders` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, store_id, destination_stock_location_id, items: [{ product_variant_id, quantity_ordered, unit_cost }] }` |
| 98 | `PUT/PATCH`| `/api/purchase-orders/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, expected_at?, notes? }` |
| 99 | `POST` | `/api/goods-receipts` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, stock_location_id, purchase_order_id?, items: [{ product_variant_id, quantity_received, unit_cost }] }` |
| 100 | `POST` | `/api/supplier-payments` | `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, purchase_order_id?, payment_method_id, amount, transaction_reference?, notes? }` |
| 101 | `PUT/PATCH`| `/api/supplier-payments/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, transaction_reference?, notes? }` |
| 102 | `POST` | `/api/stock-transfers` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ source_location_id, destination_location_id, items: [{ product_variant_id, quantity_transferred }] }` |
| 103 | `PUT/PATCH`| `/api/stock-transfers/{id}` | `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?: 'in_transit'|'received'|'cancelled', notes? }` |
| 104 | `POST` | `/api/stock-adjustments` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ stock_location_id, reason, items: [{ product_variant_id, counted_quantity }] }` |
| 105 | `PUT/PATCH`| `/api/stock-adjustments/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status: 'posted' }` (Executes inventory reconciliation) |
| 106 | `POST` | `/api/stock-transactions` | `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ stock_location_id, product_variant_id, transaction_type, quantity, unit_cost?, reference_type?, reference_id?, notes? }` |
| 107 | `POST` | `/api/customers` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ display_name, customer_type?, phone?, email?, tax_number?, credit_limit?, address?: {...} }` |
| 108 | `PUT/PATCH`| `/api/customers/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of customer profile fields |
| 109 | `POST` | `/api/customers/{id}/addresses`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ label?, address_type?, recipient_name?, phone?, city?, address_line?, is_default? }` |
| 110 | `PUT/PATCH`| `/api/customers/{id}/addresses/{addr_id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of address fields |
| 111 | `DELETE` | `/api/customers/{id}/addresses/{addr_id}`| `admin`, `manager`| `Accept`, `Authorization` | ❌ NO | None (Deletes customer address) |
| 112 | `POST` | `/api/orders` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ source, fulfillment_type, customer_id?, store_id?, stock_location_id?, items: [{ product_variant_id, quantity_ordered }] }` |
| 113 | `PUT/PATCH`| `/api/orders/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, customer_notes?, internal_notes?, shipping_fee? }` |
| 114 | `POST` | `/api/shipments` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ order_id, shipping_provider?, tracking_number?, items: [{ order_item_id, quantity_shipped }] }` |
| 115 | `PUT/PATCH`| `/api/shipments/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?: 'packed'|'shipped'|'delivered'|'cancelled', tracking_number?, notes? }` |
| 116 | `POST` | `/api/pos-registers` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ store_id, code, name, is_active? }` |
| 117 | `PUT/PATCH`| `/api/pos-registers/{id}`| `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, is_active? }` |
| 118 | `POST` | `/api/payment-methods` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code, name, method_type, provider_name?, requires_reference?, sort_order?, is_active? }` |
| 119 | `PUT/PATCH`| `/api/payment-methods/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of payment method fields |
| 120 | `POST` | `/api/tax-rates` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code, name, rate_percent, is_inclusive?, is_active?, effective_from?, effective_to? }` |
| 121 | `PUT/PATCH`| `/api/tax-rates/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of tax rate fields |
| 122 | `PUT/PATCH`| `/api/payments/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, transaction_reference?, notes? }` |
| 123 | `POST` | `/api/sale-returns` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ sale_id, reason?, restock_to_location_id?, items: [{ sale_item_id, quantity, condition?, restock? }] }` |
| 124 | `PUT/PATCH`| `/api/sale-returns/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?: 'approved'|'received'|'rejected'|'cancelled', reason?, restock_to_location_id? }` |
| 125 | `POST` | `/api/sale-refunds` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ sale_return_id, payment_method_id, amount, status?, transaction_reference?, notes? }` |
| 126 | `PUT/PATCH`| `/api/sale-refunds/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, transaction_reference?, notes? }` |
| **CASHIER / POS ENDPOINTS (`role:cashier`)** |
| 127 | `POST` | `/api/sales` | `cashier` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ items: [{ product_id, quantity }] }` |
| 128 | `GET` | `/api/sales` | `cashier` | `Accept`, `Authorization` | ❌ NO | None (Cashier's isolated sales history) |
| 129 | `GET` | `/api/sales/{id}` | `cashier` | `Accept`, `Authorization` | ❌ NO | None (Lookup cashier's receipt by ID) |

---

## 1. Public Endpoints (No Token Required)

### 1.1 `POST /api/login` — Staff Login
Authenticates any staff member (Admin, Manager, Cashier, Storekeeper) and issues a Sanctum Bearer token.

* **Access / Role:** Public (Unauthenticated)
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | String | **Required** | `required`, `email` | Registered staff email address |
  | `password` | String | **Required** | `required`, `string` | User password |

* **Request Body Example:**
  ```json
  {
    "email": "admin@gmail.com",
    "password": "password"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "token": "1|N7rW2saRBEtO5YUWY9jYUNNRkswoDuvCZdyAguzYae091adc",
    "token_type": "Bearer",
    "expires_at": "2026-10-26T18:47:31+00:00",
    "user": {
      "id": 1,
      "name": "Super Admin",
      "email": "admin@gmail.com",
      "role": "admin"
    }
  }
  ```
* **Error Response (`401 Unauthorized`):**
  ```json
  {
    "message": "The email or password is incorrect."
  }
  ```

---

### 1.2 `GET /api/products` — Browse Products Catalog
Returns paginated list of electronics products with linked categories and brands.

* **Access / Role:** Public
* **Headers Required:**
  ```http
  Accept: application/json
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Query Parameters (Optional):** `?page=1`
* **Success Response (`200 OK`):**
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "category_id": 1,
        "brand_id": 1,
        "name": "iPhone 15 Pro Max 256GB",
        "sku": "IPH-15PM-256",
        "brand": "Apple",
        "model_number": "A3106",
        "cost_price": "950.00",
        "selling_price": "1199.00",
        "quantity": 25,
        "minimum_stock": 5,
        "category": { "id": 1, "name": "Smartphones & Tablets" },
        "brand_relation": { "id": 1, "name": "Apple" }
      }
    ],
    "total": 1,
    "per_page": 15
  }
  ```

---

### 1.3 `GET /api/products/{id}` — Single Product Details
Fetches full details of a specific product with its category and brand.

* **Access / Role:** Public
* **Headers Required:**
  ```http
  Accept: application/json
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):** Returns single product JSON object.
* **Error Response (`404 Not Found`):** Product ID does not exist.

---

### 1.4 `GET /api/categories` — List Product Categories
Returns paginated categories.

* **Access / Role:** Public
* **Headers Required:**
  ```http
  Accept: application/json
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Smartphones & Tablets",
        "description": "Mobile phones, tablets, and phablets",
        "created_at": "2026-10-21T10:00:00.000000Z",
        "updated_at": "2026-10-21T10:00:00.000000Z"
      }
    ],
    "total": 1
  }
  ```

---

### 1.5 `GET /api/categories/{id}` — Single Category Details
* **Access / Role:** Public
* **Headers Required:** `Accept: application/json`
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):** Category JSON object.

---

### 1.6 `GET /api/brands` — List Brands
Returns paginated list of brands with an eager count of assigned products.

* **Access / Role:** Public
* **Headers Required:** `Accept: application/json`
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Apple",
        "description": "Cupertino consumer electronics",
        "is_active": true,
        "products_count": 8,
        "created_at": "2026-10-21T10:00:00.000000Z"
      }
    ],
    "total": 1
  }
  ```

---

### 1.7 `GET /api/brands/{id}` — Single Brand & Assigned Products
* **Access / Role:** Public
* **Headers Required:** `Accept: application/json`
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):** Brand object with `products` array loaded.

---

## 2. Common Authenticated Endpoints (Any Role)

These endpoints require any valid logged-in user (`admin`, `manager`, `cashier`, or `storekeeper`).

### 2.1 `GET /api/user` — Current User Profile
Retrieves identity and role information for the currently active Bearer token.

* **Access / Role:** Authenticated (Any role)
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@gmail.com",
    "role": "admin"
  }
  ```
* **Error Response (`401 Unauthorized`):** Token missing or invalid.

---

### 2.2 `POST /api/logout` — Revoke Active Token
Invalidates the current session token on the server.

* **Access / Role:** Authenticated (Any role)
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Logged out successfully."
  }
  ```

---

## 3. Admin-Only Endpoints (`role:admin`)

These endpoints strictly require the `admin` role. If accessed with another role, the API returns `403 Forbidden`.

### 3.1 `GET /api/admin/users` — List Staff Accounts
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Super Admin",
        "email": "admin@gmail.com",
        "role": "admin",
        "email_verified_at": null,
        "created_at": "2026-10-21T08:00:00.000000Z"
      },
      {
        "id": 2,
        "name": "Jane Cashier",
        "email": "jane@gmail.com",
        "role": "cashier",
        "email_verified_at": null,
        "created_at": "2026-10-22T09:30:00.000000Z"
      }
    ],
    "total": 2
  }
  ```

---

### 3.2 `POST /api/admin/users` — Create New Staff Account
Creates a staff member account (Manager, Cashier, or Storekeeper).

* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | String | **Required** | `required`, `string`, `max:255` | Staff member's full name |
  | `email` | String | **Required** | `required`, `email`, `unique:users,email` | Unique staff email |
  | `password` | String | **Required** | `required`, `confirmed`, `min:8` | Password (min 8 chars) |
  | `password_confirmation` | String | **Required** | Must match `password` | Repeat password |
  | `role` | String | **Required** | `in:manager,cashier,storekeeper` | Assigned system role |

* **Request Body Example:**
  ```json
  {
    "name": "Alex Manager",
    "email": "alex.mgr@electronics.com",
    "password": "SecurePassword123!",
    "password_confirmation": "SecurePassword123!",
    "role": "manager"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Staff account created successfully.",
    "user": {
      "id": 3,
      "name": "Alex Manager",
      "email": "alex.mgr@electronics.com",
      "role": "manager"
    }
  }
  ```

---

### 3.3 `POST /api/categories` — Create Category
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | String | **Required** | `required`, `max:255`, `unique:categories,name` | Category name |
  | `description` | String | Optional | `nullable`, `string` | Optional details |

* **Request Body Example:**
  ```json
  {
    "name": "Smart Home & IoT",
    "description": "Smart bulbs, smart plugs, hubs, and cameras"
  }
  ```
* **Success Response (`201 Created`):** Returns created Category JSON.

---

### 3.4 `PUT/PATCH /api/categories/{id}` — Update Category
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Rules |
  | :--- | :--- | :--- | :--- |
  | `name` | String | Optional | `sometimes`, `required`, `max:255`, unique except current ID |
  | `description` | String | Optional | `sometimes`, `nullable`, `string` |

* **Request Body Example:**
  ```json
  {
    "name": "Smart Home & Automation",
    "description": "Updated IoT and home automation systems"
  }
  ```
* **Success Response (`200 OK`):** Returns updated category JSON.

---

### 3.5 `DELETE /api/categories/{id}` — Delete Category
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Category deleted successfully."
  }
  ```
* **Conflict Guard Response (`409 Conflict`):**
  *Returned if any product is currently assigned to this category.*
  ```json
  {
    "message": "This category cannot be deleted while it has products."
  }
  ```

---

### 3.6 `DELETE /api/products/{id}` — Delete Product
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Product deleted successfully."
  }
  ```

---

### 3.7 `DELETE /api/brands/{id}` — Delete Brand
* **Access / Role:** `admin` only
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Brand deleted successfully."
  }
  ```
* **Conflict Guard Response (`409 Conflict`):**
  *Returned if any product is currently linked to this brand.*
  ```json
  {
    "message": "This brand cannot be deleted while it has products assigned to it."
  }
  ```

---

## 4. Admin & Manager Endpoints (`role:admin,manager`)

Accessible by users with either `admin` or `manager` role.

### 4.1 `POST /api/products` — Create Product
* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `category_id` | Integer | **Required** | `required`, `exists:categories,id` | Foreign key to `categories` |
  | `brand_id` | Integer | Optional | `nullable`, `exists:brands,id` | Foreign key to `brands` |
  | `name` | String | **Required** | `required`, `string`, `max:255` | Product title |
  | `sku` | String | **Required** | `required`, `string`, `max:255`, `unique:products,sku` | Barcode or unique SKU |
  | `brand` | String | Optional | `nullable`, `string`, `max:255` | Brand label string |
  | `model_number`| String | Optional | `nullable`, `string`, `max:255` | Manufacturer model number |
  | `cost_price` | Numeric | **Required** | `required`, `numeric`, `min:0` | Wholesale / Purchase cost |
  | `selling_price`| Numeric| **Required** | `required`, `numeric`, `min:0` | Retail selling price |
  | `quantity` | Integer | **Required** | `required`, `integer`, `min:0` | Initial inventory units |
  | `minimum_stock`| Integer| **Required** | `required`, `integer`, `min:0` | Low-stock threshold |

* **Request Body Example:**
  ```json
  {
    "category_id": 1,
    "brand_id": 1,
    "name": "iPad Pro 13-inch M4",
    "sku": "IPAD-PRO-13-M4",
    "brand": "Apple",
    "model_number": "A2925",
    "cost_price": 999.00,
    "selling_price": 1299.00,
    "quantity": 15,
    "minimum_stock": 3
  }
  ```
* **Success Response (`201 Created`):** Returns created product object with loaded `category` and `brand`.

---

### 4.2 `PUT/PATCH /api/products/{id}` — Update Product
* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:** Any subset of fields from `POST /api/products` (validated using `sometimes`).
* **Request Body Example:**
  ```json
  {
    "selling_price": 1249.00,
    "quantity": 20
  }
  ```
* **Success Response (`200 OK`):** Returns refreshed product object.

---

### 4.3 `POST /api/brands` — Create Brand
* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | String | **Required** | `required`, `string`, `max:120`, `unique:brands,name` | Brand title |
  | `description` | String | Optional | `nullable`, `string` | Brand overview |
  | `is_active` | Boolean | Optional | `nullable`, `boolean` | Status flag (`true` or `false`) |

* **Request Body Example:**
  ```json
  {
    "name": "Sony",
    "description": "Cameras, PlayStation, and consumer audio",
    "is_active": true
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Brand created successfully.",
    "brand": {
      "id": 3,
      "name": "Sony",
      "description": "Cameras, PlayStation, and consumer audio",
      "is_active": true,
      "created_at": "2026-10-25T11:00:00.000000Z"
    }
  }
  ```

---

### 4.4 `PUT/PATCH /api/brands/{id}` — Update Brand
* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:** Any subset of `name`, `description`, `is_active`.
* **Request Body Example:**
  ```json
  {
    "is_active": false
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Brand updated successfully.",
    "brand": {
      "id": 3,
      "name": "Sony",
      "description": "Cameras, PlayStation, and consumer audio",
      "is_active": false
    }
  }
  ```

---

### 4.5 `POST /api/stock-transfers` — Create Stock Transfer (Draft)
Initiates an inter-location or cross-store stock transfer request. Validates stock availability at the origin location.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `source_location_id` | Integer | **Required** | `required`, `exists:stock_locations,id` | Origin stock location |
  | `destination_location_id` | Integer | **Required** | `required`, `exists:stock_locations,id`, `different:source_location_id` | Destination stock location |
  | `notes` | String | Optional | `nullable`, `string` | Reason or transfer reference notes |
  | `items` | Array | **Required** | `required`, `array`, `min:1` | List of items being transferred |
  | `items.*.product_variant_id` | Integer | **Required** | `required`, `exists:product_variants,id` | Product variant ID |
  | `items.*.quantity_transferred` | Number | **Required** | `required`, `numeric`, `min:0.01` | Quantity units to transfer |

* **Request Body Example:**
  ```json
  {
    "source_location_id": 1,
    "destination_location_id": 2,
    "notes": "Restocking retail floor shelves from main warehouse",
    "items": [
      {
        "product_variant_id": 1,
        "quantity_transferred": 5
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Stock transfer created successfully.",
    "data": {
      "id": 1,
      "transfer_number": "TRF-20261028-0001",
      "source_location_id": 1,
      "destination_location_id": 2,
      "status": "draft",
      "items": [
        {
          "id": 1,
          "product_variant_id": 1,
          "quantity_transferred": 5.00
        }
      ]
    }
  }
  ```

---

### 4.6 `PUT/PATCH /api/stock-transfers/{id}` — Update Transfer Status
Transitions the transfer lifecycle. When transitioned to `in_transit`, inventory is safely deducted from the origin location. When transitioned to `received`, inventory is credited to the destination location.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `status` | String | Optional | `in:draft,in_transit,received,cancelled` | New lifecycle status |
  | `notes` | String | Optional | `nullable`, `string` | Inspection or delivery comments |

* **Request Body Example:**
  ```json
  {
    "status": "received",
    "notes": "All 5 units verified undamaged and added to shelf balance"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Stock transfer updated successfully.",
    "data": {
      "id": 1,
      "transfer_number": "TRF-20261028-0001",
      "status": "received"
    }
  }
  ```

---

### 4.7 `POST /api/stock-adjustments` — Create Stock Audit / Cycle Count
Records a physical stock audit for discrepancy verification. Automatically fetches current system balances and computes variances (`difference_quantity = counted_quantity - snapshot_quantity`).

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `stock_location_id` | Integer | **Required** | `required`, `exists:stock_locations,id` | Location audited |
  | `reason` | String | **Required** | `required`, `string`, `max:255` | Audit reason (e.g., Annual Physical Audit, Breakage) |
  | `notes` | String | Optional | `nullable`, `string` | Detailed auditor notes |
  | `items` | Array | **Required** | `required`, `array`, `min:1` | Audited line items |
  | `items.*.product_variant_id` | Integer | **Required** | `required`, `exists:product_variants,id` | Product variant ID |
  | `items.*.counted_quantity` | Number | **Required** | `required`, `numeric`, `min:0` | Actual count verified by auditor |

* **Request Body Example:**
  ```json
  {
    "stock_location_id": 1,
    "reason": "Quarterly physical cycle count audit",
    "items": [
      {
        "product_variant_id": 1,
        "counted_quantity": 28
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Stock adjustment recorded in draft status.",
    "data": {
      "id": 1,
      "adjustment_number": "ADJ-20261028-0001",
      "stock_location_id": 1,
      "status": "draft",
      "items": [
        {
          "product_variant_id": 1,
          "snapshot_quantity": 30.00,
          "counted_quantity": 28.00,
          "difference_quantity": -2.00
        }
      ]
    }
  }
  ```

---

### 4.8 `PUT/PATCH /api/stock-adjustments/{id}` — Post Stock Adjustment
Executes atomic inventory reconciliation. Adjusts the `stock_balances` and parent `products.quantity` according to the calculated variances, and writes immutable audit logs.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Example:**
  ```json
  {
    "status": "posted"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Stock adjustment posted and inventory reconciled.",
    "data": {
      "id": 1,
      "adjustment_number": "ADJ-20261028-0001",
      "status": "posted"
    }
  }
  ```

---

### 4.9 `POST /api/stock-transactions` — Direct Manual Ledger Audit Entry
Records a direct inventory audit adjustment with ledger trail tracking.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `stock_location_id` | Integer | **Required** | `required`, `exists:stock_locations,id` | Target location |
  | `product_variant_id` | Integer | **Required** | `required`, `exists:product_variants,id` | Product variant ID |
  | `transaction_type` | String | **Required** | `required`, `string`, `max:50` | E.g. `manual_in`, `manual_out`, `audit_writeoff` |
  | `quantity` | Number | **Required** | `required`, `numeric` | Positive for inbound, negative for outbound |
  | `unit_cost` | Number | Optional | `nullable`, `numeric`, `min:0` | Unit valuation cost |
  | `notes` | String | Optional | `nullable`, `string` | Audit reason |

* **Request Body Example:**
  ```json
  {
    "stock_location_id": 1,
    "product_variant_id": 1,
    "transaction_type": "manual_in",
    "quantity": 10,
    "unit_cost": 899.00,
    "notes": "Emergency vendor sample arrival"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Stock transaction recorded and inventory updated.",
    "data": {
      "id": 1,
      "stock_location_id": 1,
      "product_variant_id": 1,
      "transaction_type": "manual_in",
      "quantity": 10.00
    }
  }
  ```

---

### 4.10 `POST /api/customers` — Create Customer Profile
Registers an individual or corporate customer with credit limits and an optional embedded default address.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Example:**
  ```json
  {
    "customer_code": "CUST-CORP-001",
    "customer_type": "corporate",
    "display_name": "Ethio Telecom Procurement",
    "phone": "+251911223344",
    "email": "procurement@ethiotelecom.et",
    "tax_number": "TIN-9876543210",
    "credit_limit": 500000.00,
    "default_credit_days": 30,
    "notes": "Key enterprise corporate account",
    "address": {
      "label": "Headquarters",
      "address_type": "both",
      "recipient_name": "Abebe Bikila",
      "phone": "+251911223344",
      "country_code": "ET",
      "city": "Addis Ababa",
      "sub_city": "Kirkos",
      "address_line": "Churchill Avenue, Posta Bet",
      "is_default": true
    }
  }
  ```
* **Success Response (`201 Created`):** Returns the newly created customer with linked addresses.

---

### 4.11 `POST /api/customers/{id}/addresses` — Add Customer Address
Attaches additional billing or shipping locations to a customer profile.

* **Access / Role:** `admin`, `manager`
* **Request Body Example:**
  ```json
  {
    "label": "Bole Branch Office",
    "address_type": "shipping",
    "recipient_name": "Marta Tefera",
    "phone": "+251922334455",
    "city": "Addis Ababa",
    "sub_city": "Bole",
    "address_line": "Medhanialem Mall, 3rd Floor",
    "is_default": false
  }
  ```
* **Success Response (`201 Created`):** Returns created address record.

---

### 4.12 `POST /api/orders` — Create Multi-Channel Order
Creates an omni-channel order across POS, Online, or Backoffice channels. Automatically generates order numbers, validates and reserves inventory, snapshots product names and SKUs, and calculates line totals, taxes, and discounts.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Example:**
  ```json
  {
    "source": "backoffice",
    "status": "confirmed",
    "fulfillment_type": "delivery",
    "customer_id": 1,
    "store_id": 1,
    "stock_location_id": 1,
    "shipping_fee": 150.00,
    "customer_notes": "Deliver during working hours 9 AM - 5 PM",
    "internal_notes": "Corporate PO-2026-998 Attached",
    "items": [
      {
        "product_variant_id": 1,
        "quantity_ordered": 2,
        "unit_price": 1199.00,
        "discount_amount": 50.00,
        "tax_rate_percent": 15.0
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Order created successfully.",
    "order": {
      "id": 1,
      "order_number": "ORD-20261028-A4F1E9",
      "status": "confirmed",
      "subtotal": 2398.00,
      "discount_total": 50.00,
      "tax_total": 352.20,
      "shipping_fee": 150.00,
      "grand_total": 2850.20
    }
  }
  ```

---

### 4.13 `PUT/PATCH /api/orders/{id}` — Update Order Status / Lifecycle
Transitions order lifecycle status (`draft`, `pending_payment`, `confirmed`, `processing`, `shipped`, `completed`, `cancelled`). Reconciles and releases stock reservations automatically upon cancellation or fulfillment.

* **Access / Role:** `admin`, `manager`
* **Request Body Example:**
  ```json
  {
    "status": "processing",
    "internal_notes": "Items picked and undergoing packaging"
  }
  ```

---

### 4.14 `POST /api/shipments` — Create Dispatch Package
Dispatches courier packages and fulfills line items on confirmed orders. Automatically checks unfulfilled quantities and tracks logistics courier references.

* **Access / Role:** `admin`, `manager`
* **Request Body Example:**
  ```json
  {
    "order_id": 1,
    "status": "shipped",
    "shipping_provider": "DHL Express",
    "tracking_number": "DHL-ET-982104928",
    "recipient_name": "Abebe Bikila",
    "recipient_phone": "+251911223344",
    "notes": "Fragile electronics handle with care",
    "items": [
      {
        "order_item_id": 1,
        "quantity_shipped": 2
      }
    ]
  }
  ```
* **Success Response (`201 Created`):** Returns shipment with items and updated order status.

---

### 4.15 `PUT/PATCH /api/shipments/{id}` — Update Tracking / Delivery Status
Transitions shipment delivery states (`packed`, `shipped`, `delivered`, `failed`, `cancelled`). Automatically marks parent order as `completed` when all packages are delivered.

* **Access / Role:** `admin`, `manager`
* **Request Body Example:**
  ```json
  {
    "status": "delivered",
    "notes": "Delivered and signed by recipient Abebe Bikila"
  }
  ```

### 4.16 `POST /api/pos-registers` — Create POS Register
Registers a physical terminal or workstation drawer assigned to a specific store.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `store_id` | Integer | **Required** | `required`, `exists:stores,id` | Owning retail store |
  | `code` | String | **Required** | `required`, `string`, `max:50`, `unique:pos_registers,code` | Unique terminal code |
  | `name` | String | **Required** | `required`, `string`, `max:100` | Friendly terminal name |
  | `is_active` | Boolean | Optional | `nullable`, `boolean` | Register active status |

* **Request Body Example:**
  ```json
  {
    "store_id": 1,
    "code": "REG-01",
    "name": "Main Checkout Register 1",
    "is_active": true
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "POS register created successfully.",
    "register": {
      "id": 1,
      "store_id": 1,
      "code": "REG-01",
      "name": "Main Checkout Register 1",
      "is_active": true,
      "created_at": "2026-10-28T12:00:00.000000Z"
    }
  }
  ```

---

### 4.17 `POST /api/cashier-shifts/open` — Open Cashier Shift
Opens an active cashier register shift. Automatically verifies that neither the cashier nor the selected register has an existing unclosed shift, sets `opened_at = now()`, and inserts an `opening_float` audit entry in `cash_movements`.

* **Access / Role:** `admin`, `manager`, `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `pos_register_id` | Integer | **Required** | `required`, `exists:pos_registers,id` | Physical register |
  | `opening_float` | Number | **Required** | `required`, `numeric`, `min:0` | Initial starting drawer cash |
  | `notes` | String | Optional | `nullable`, `string` | Shift opening notes |

* **Request Body Example:**
  ```json
  {
    "pos_register_id": 1,
    "opening_float": 1500.00,
    "notes": "Morning opening shift float verified"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Cashier shift opened successfully.",
    "shift": {
      "id": 1,
      "pos_register_id": 1,
      "user_id": 2,
      "status": "open",
      "opening_float": 1500.00,
      "expected_cash": 1500.00,
      "opened_at": "2026-10-28T08:00:00.000000Z"
    }
  }
  ```

---

### 4.18 `POST /api/cashier-shifts/{id}/close` — Close Cashier Shift & Reconcile Drawer
Closes an open cashier shift, calculates expected cash by summing drawer movements, compares against counted cash (`drawer_variance = counted_cash - expected_cash`), and flags shifts as `reconciled` or `discrepant`.

* **Access / Role:** `admin`, `manager`, `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `counted_cash` | Number | **Required** | `required`, `numeric`, `min:0` | Actual cash physically counted |
  | `notes` | String | Optional | `nullable`, `string` | Shift handover / drawer notes |

* **Request Body Example:**
  ```json
  {
    "counted_cash": 3898.00,
    "notes": "Evening closing shift. Cash matched expected register receipts."
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Cashier shift closed and reconciled successfully.",
    "shift": {
      "id": 1,
      "status": "closed",
      "opening_float": 1500.00,
      "expected_cash": 3898.00,
      "closing_cash": 3898.00,
      "cash_difference": 0.00,
      "closed_at": "2026-10-28T17:00:00.000000Z"
    }
  }
  ```

---

### 4.19 `POST /api/cash-movements` — Log Shift Cash Movement
Logs petty cash payouts, safe cash drops, and register float replenishment. Automatically maintains the running `expected_cash` on the target open shift.

* **Access / Role:** `admin`, `manager`, `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `cashier_shift_id` | Integer | **Required** | `required`, `exists:cashier_shifts,id` | Target open shift |
  | `movement_type` | String | **Required** | `required`, `in:cash_in,cash_out,drop,expense,float_addition` | Movement category |
  | `amount` | Number | **Required** | `required`, `numeric`, `min:0.01` | Cash amount |
  | `reason` | String | **Required** | `required`, `string`, `max:255` | Ledger audit reason |

* **Request Body Example:**
  ```json
  {
    "cashier_shift_id": 1,
    "movement_type": "expense",
    "amount": 120.00,
    "reason": "Receipt paper roll replacement and emergency store cleaning supplies"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Cash movement recorded successfully.",
    "movement": {
      "id": 2,
      "cashier_shift_id": 1,
      "movement_type": "expense",
      "amount": 120.00,
      "reason": "Receipt paper roll replacement and emergency store cleaning supplies"
    }
  }
  ```

---

### 4.20 `POST /api/payment-methods` — Register Payment Method
Configures payment tender methods (Cash, Telebirr, CBE Birr, Bank Wire, Credit Card, Voucher).

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `code` | String | **Required** | `required`, `string`, `max:50`, `unique:payment_methods,code` | Method code (e.g., `CBE_BIRR`) |
  | `name` | String | **Required** | `required`, `string`, `max:100` | Display label (e.g., `Commercial Bank of Ethiopia (CBE Birr)`) |
  | `method_type` | String | **Required** | `required`, `string`, `max:50` | Category (`cash`, `mobile_money`, `bank_transfer`, `card`) |
  | `provider_name` | String | Optional | `nullable`, `string`, `max:100` | Gateway / Provider name |
  | `requires_reference` | Boolean | Optional | `nullable`, `boolean` | True if transaction slip / reference ID required |
  | `is_active` | Boolean | Optional | `nullable`, `boolean` | Active flag |

* **Request Body Example:**
  ```json
  {
    "code": "CBE_BIRR",
    "name": "Commercial Bank of Ethiopia (CBE Birr)",
    "method_type": "mobile_money",
    "provider_name": "Commercial Bank of Ethiopia",
    "requires_reference": true,
    "is_active": true
  }
  ```
* **Success Response (`201 Created`):** Returns configured payment method record.

---

### 4.21 `POST /api/payments` — Record Tender Payment
Processes tender transactions linked to orders, sales, or customer accounts. Automatically logs cash tender directly into the active cashier's shift drawer.

* **Access / Role:** `admin`, `manager`, `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `order_id` | Integer | Optional | `nullable`, `exists:orders,id` | Linked order |
  | `payment_method_id` | Integer | **Required** | `required`, `exists:payment_methods,id` | Selected payment tender |
  | `cashier_shift_id` | Integer | Optional | `nullable`, `exists:cashier_shifts,id` | Active shift (auto-detected for cashiers) |
  | `amount` | Number | **Required** | `required`, `numeric`, `min:0.01` | Payment amount |
  | `currency` | String | Optional | `nullable`, `string`, `size:3` | ISO Currency code (default `ETB`) |
  | `status` | String | Optional | `in:pending,succeeded,failed,reversed` | Initial payment status (default `succeeded`) |
  | `transaction_reference` | String | Optional | `nullable`, `string`, `max:255` | Bank slip or mobile transfer reference |
  | `notes` | String | Optional | `nullable`, `string` | Payment memo |

* **Request Body Example:**
  ```json
  {
    "order_id": 1,
    "payment_method_id": 3,
    "amount": 2850.20,
    "currency": "ETB",
    "transaction_reference": "TLB-REC-20261028-892147",
    "notes": "Telebirr merchant payment verified via SMS notification"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Payment recorded successfully.",
    "payment": {
      "id": 1,
      "payment_number": "PAY-20261028-0001",
      "order_id": 1,
      "amount": 2850.20,
      "status": "succeeded",
      "transaction_reference": "TLB-REC-20261028-892147"
    }
  }
  ```

---

### 4.22 `POST /api/tax-rates` — Create Tax Rate Configuration
Configures multi-tier tax regulations (VAT, TOT, Withholding).

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `code` | String | **Required** | `required`, `string`, `max:50`, `unique:tax_rates,code` | Tax code (e.g., `VAT-15`) |
  | `name` | String | **Required** | `required`, `string`, `max:100` | Tax title (e.g., `Value Added Tax 15%`) |
  | `rate_percent` | Number | **Required** | `required`, `numeric`, `min:0`, `max:100` | Percentage rate |
  | `is_inclusive` | Boolean | Optional | `nullable`, `boolean` | True if included in price tag |
  | `is_active` | Boolean | Optional | `nullable`, `boolean` | Active status flag |

* **Request Body Example:**
  ```json
  {
    "code": "VAT-15",
    "name": "Standard Value Added Tax 15%",
    "rate_percent": 15.00,
    "is_inclusive": false,
    "is_active": true
  }
  ```
* **Success Response (`201 Created`):** Returns configured tax rate record.

---

### 4.23 `POST /api/sale-returns` — Create Sale Return Request
Processes a customer return request against an original sale invoice. Checks available returnable quantities, calculates item and total refund amounts, records return lines with condition tags (`sellable`, `damaged`, `opened`, `defective`), and optionally restocks inventory immediately into warehouse balances.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `sale_id` | Integer | **Required** | `required`, `exists:sales,id` | Original sale receipt |
  | `customer_id` | Integer | Optional | `nullable`, `exists:customers,id` | Customer (defaults to sale's customer) |
  | `status` | String | Optional | `in:requested,approved,rejected,received,refunded,completed,cancelled` | Lifecycle status (default `requested`) |
  | `reason` | String | Optional | `nullable`, `string`, `max:500` | Return reason / explanation |
  | `restock_to_location_id` | Integer | Optional | `nullable`, `exists:stock_locations,id` | Destination restock warehouse location |
  | `items` | Array | **Required** | `required`, `array`, `min:1` | Returned line items |
  | `items.*.sale_item_id` | Integer | **Required** | `required`, `exists:sale_items,id` | Sale item being returned |
  | `items.*.quantity` | Number | **Required** | `required`, `numeric`, `min:0.001` | Quantity returned |
  | `items.*.condition` | String | Optional | `in:sellable,damaged,opened,defective` | Physical condition tag (default `sellable`) |
  | `items.*.restock` | Boolean | Optional | `nullable`, `boolean` | True if returned item should increment stock |
  | `items.*.refund_amount` | Number | Optional | `nullable`, `numeric`, `min:0` | Line refund total (auto-calculated if omitted) |

* **Request Body Example:**
  ```json
  {
    "sale_id": 1,
    "reason": "Customer purchased wrong storage configuration within 7-day policy",
    "restock_to_location_id": 1,
    "items": [
      {
        "sale_item_id": 1,
        "quantity": 1,
        "condition": "sellable",
        "restock": true
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Sale return request created successfully.",
    "return": {
      "id": 1,
      "return_number": "RET-20261028-0001",
      "sale_id": 1,
      "status": "requested",
      "refund_total": 1199.00,
      "items": [
        {
          "id": 1,
          "product_variant_id": 1,
          "quantity": 1.000,
          "condition": "sellable",
          "restock": true,
          "refund_amount": 1199.00
        }
      ]
    }
  }
  ```

---

### 4.24 `POST /api/sale-refunds` — Disburse Customer Refund Payout
Issues an official customer tender refund payout against an approved or received sale return. Validates the refund against the remaining returnable balance ceiling, records ledger transactions, and automatically logs cash payouts directly against active cashier shift drawers.

* **Access / Role:** `admin`, `manager`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `sale_return_id` | Integer | **Required** | `required`, `exists:sale_returns,id` | Linked sale return |
  | `payment_method_id` | Integer | **Required** | `required`, `exists:payment_methods,id` | Payment tender for payout |
  | `amount` | Number | **Required** | `required`, `numeric`, `min:0.01` | Payout amount |
  | `status` | String | Optional | `in:pending,succeeded,failed,cancelled` | Refund status (default `succeeded`) |
  | `transaction_reference` | String | Optional | `nullable`, `string`, `max:150` | Reversal slip or mobile payout transaction ID |
  | `notes` | String | Optional | `nullable`, `string` | Audit memo |

* **Request Body Example:**
  ```json
  {
    "sale_return_id": 1,
    "payment_method_id": 1,
    "amount": 1199.00,
    "status": "succeeded",
    "transaction_reference": "CSH-DISBURSE-001",
    "notes": "Full tender refund paid in cash at counter register"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Customer refund payout recorded successfully.",
    "refund": {
      "id": 1,
      "refund_number": "REF-20261028-0001",
      "sale_return_id": 1,
      "payment_method_id": 1,
      "amount": 1199.00,
      "status": "succeeded",
      "refunded_at": "2026-10-28T12:50:00.000000Z"
    }
  }
  ```

---

## 5. Cashier / POS Endpoints (`role:cashier`)

Dedicated to point-of-sale operations, inventory decrement transactions, and cashier sales auditing.

### 5.1 `POST /api/sales` — Process POS Sale Checkout
Processes an atomic checkout: locks stock, verifies availability, calculates tamper-proof line totals from `selling_price`, decrements product inventory, and auto-generates POS orders.

* **Access / Role:** `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **✅ YES (JSON Object)**
* **Request Body Fields:**
  | Field | Type | Required? | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `items` | Array | **Required** | `required`, `array`, `min:1` | List of items being purchased |
  | `items.*.product_id` | Integer | **Required** | `required`, `exists:products,id` | Product ID from catalog |
  | `items.*.quantity` | Integer | **Required** | `required`, `integer`, `min:1` | Quantity units to buy |

* **Request Body Example:**
  ```json
  {
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Sale completed successfully.",
    "sale": {
      "id": 5,
      "cashier_id": 2,
      "total_amount": 2398.00,
      "items": [
        {
          "product_id": 1,
          "product_name": "iPhone 15 Pro Max 256GB",
          "sku": "IPH-15PM-256",
          "quantity_sold": 2,
          "unit_price": 1199.00,
          "line_total": 2398.00,
          "remaining_stock": 23
        }
      ],
      "created_at": "2026-10-25T11:45:00.000000Z"
    }
  }
  ```
* **Stock Overdraft Error Response (`422 Unprocessable Entity`):**
  *Returned if the requested quantity exceeds the current warehouse inventory.*
  ```json
  {
    "message": "Insufficient stock for 'iPhone 15 Pro Max 256GB'. Available: 1, Requested: 2.",
    "errors": {
      "items": [
        "Insufficient stock for 'iPhone 15 Pro Max 256GB'. Available: 1, Requested: 2."
      ]
    }
  }
  ```

---

### 5.2 `GET /api/sales` — Cashier Sales History
Returns a paginated list of sales created specifically by the currently authenticated cashier.

* **Access / Role:** `cashier`
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Query Parameters (Optional):** `?page=1`
* **Success Response (`200 OK`):**
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 5,
        "total_amount": "2398.00",
        "created_at": "2026-10-25T11:45:00.000000Z"
      }
    ],
    "total": 1,
    "per_page": 15
  }
  ```

---

### 5.3 `GET /api/sales/{id}` — View Cashier Sale Receipt
Fetches an individual sale receipt.

* **Access / Role:** `cashier` (Scoped strictly to sales recorded by the calling cashier)
* **Headers Required:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```
* **Body Required:** **❌ NO (Empty body)**
* **Success Response (`200 OK`):**
  ```json
  {
    "id": 5,
    "total_amount": "2398.00",
    "created_at": "2026-10-25T11:45:00.000000Z"
  }
  ```
* **Isolation Guard (`404 Not Found`):**
  *If a cashier attempts to access a sale recorded by another user or cashier, a `404 Not Found` is returned.*

---

## 6. HTTP Status Codes & Error Conventions

| HTTP Status | Name | Cause | Example Scenario |
| :--- | :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded with response payload. | Fetching products, user profile, category list. |
| **`201 Created`** | Created | New database record successfully inserted. | User, Category, Brand, Product, or Sale created. |
| **`401 Unauthorized`** | Unauthenticated | Missing, expired, or malformed Bearer token. | Attempting `/api/user` without an Authorization header. |
| **`403 Forbidden`** | Forbidden | Valid token, but user role lacks authorization. | Cashier attempting `POST /api/products` or `GET /api/admin/users`. |
| **`404 Not Found`** | Not Found | Route or database resource does not exist. | Invalid product ID or accessing another cashier's sale. |
| **`409 Conflict`** | Conflict | Action violates integrity constraints. | Deleting a Category or Brand that has linked Products. |
| **`422 Unprocessable`** | Validation Error | Body payload failed input validation or stock check. | Missing required field, duplicate email/SKU, or stock overdraft. |