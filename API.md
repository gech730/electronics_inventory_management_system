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
| **COMMON AUTHENTICATED ENDPOINTS (Any Authenticated Role)** |
| 24 | `GET` | `/api/user` | **Any Role** (`admin`, `manager`, `cashier`, `storekeeper`) | `Accept`, `Authorization` | ❌ NO | None (Returns current user identity & role) |
| 25 | `POST` | `/api/logout` | **Any Role** (`admin`, `manager`, `cashier`, `storekeeper`) | `Accept`, `Authorization` | ❌ NO | None (Revokes current Sanctum Bearer token) |
| **ADMIN-ONLY ENDPOINTS (`role:admin`)** |
| 26 | `GET` | `/api/admin/users` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Paginated staff list) |
| 27 | `POST` | `/api/admin/users` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, email, password, password_confirmation, role }` |
| 28 | `POST` | `/api/categories` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, description }` |
| 29 | `PUT/PATCH`| `/api/categories/{id}` | `admin` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, description? }` |
| 30 | `DELETE` | `/api/categories/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes category with product-conflict guard) |
| 31 | `DELETE` | `/api/products/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes product from catalog) |
| 32 | `DELETE` | `/api/brands/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes brand with product-conflict guard) |
| 33 | `DELETE` | `/api/units/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes unit with product-conflict guard) |
| 34 | `DELETE` | `/api/stores/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes store with location-conflict guard) |
| 35 | `DELETE` | `/api/stock-locations/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes location with on-hand stock guard) |
| 36 | `DELETE` | `/api/stock-balances/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes stock balance if on-hand is 0) |
| 37 | `DELETE` | `/api/suppliers/{id}` | `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes supplier with PO-conflict guard) |
| 38 | `DELETE` | `/api/purchase-orders/{id}`| `admin` | `Accept`, `Authorization` | ❌ NO | None (Deletes purchase order if draft or cancelled) |
| **ADMIN & MANAGER ENDPOINTS (`role:admin,manager`)** |
| 39 | `POST` | `/api/products` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ category_id, sku, name, cost_price, selling_price, quantity, minimum_stock, brand_id?, ... }` |
| 40 | `PUT/PATCH`| `/api/products/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of product fields to update |
| 41 | `POST` | `/api/brands` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, description?, is_active? }` |
| 42 | `PUT/PATCH`| `/api/brands/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, description?, is_active? }` |
| 43 | `POST` | `/api/units` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name, abbreviation, allows_decimal_quantity? }` |
| 44 | `PUT/PATCH`| `/api/units/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ name?, abbreviation?, allows_decimal_quantity? }` |
| 45 | `POST` | `/api/stores` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code, name, phone?, email?, address?, is_active? }` |
| 46 | `PUT/PATCH`| `/api/stores/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ code?, name?, phone?, email?, address?, is_active? }` |
| 47 | `POST` | `/api/stock-locations` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ store_id?, code, name, location_type, is_sellable?, is_active? }` |
| 48 | `PUT/PATCH`| `/api/stock-locations/{id}`| `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of stock location fields |
| 49 | `POST` | `/api/stock-balances` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ stock_location_id, product_variant_id, quantity_on_hand, quantity_reserved?, reorder_level? }` |
| 50 | `PUT/PATCH`| `/api/stock-balances/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ quantity_on_hand?, quantity_reserved?, reorder_level? }` |
| 51 | `POST` | `/api/suppliers` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_code, name, contact_person?, phone?, email?, tax_number?, address?, payment_terms_days? }` |
| 52 | `PUT/PATCH`| `/api/suppliers/{id}` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | Any subset of supplier fields |
| 53 | `POST` | `/api/purchase-orders` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, store_id, destination_stock_location_id, items: [{ product_variant_id, quantity_ordered, unit_cost }] }` |
| 54 | `PUT/PATCH`| `/api/purchase-orders/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, expected_at?, notes? }` |
| 55 | `POST` | `/api/goods-receipts` | `admin`, `manager` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, stock_location_id, purchase_order_id?, items: [{ product_variant_id, quantity_received, unit_cost }] }` |
| 56 | `POST` | `/api/supplier-payments` | `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ supplier_id, purchase_order_id?, payment_method_id, amount, transaction_reference?, notes? }` |
| 57 | `PUT/PATCH`| `/api/supplier-payments/{id}`| `admin`, `manager`| `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ status?, transaction_reference?, notes? }` |
| **CASHIER / POS ENDPOINTS (`role:cashier`)** |
| 58 | `POST` | `/api/sales` | `cashier` | `Accept`, `Content-Type`, `Authorization` | **✅ YES** | `{ items: [{ product_id, quantity }] }` |
| 59 | `GET` | `/api/sales` | `cashier` | `Accept`, `Authorization` | ❌ NO | None (Cashier's isolated sales history) |
| 60 | `GET` | `/api/sales/{id}` | `cashier` | `Accept`, `Authorization` | ❌ NO | None (Lookup cashier's receipt by ID) |

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