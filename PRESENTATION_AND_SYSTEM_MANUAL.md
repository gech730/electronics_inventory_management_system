# 👑 Ngus Electronics (VoltTrack StockWise Enterprise)
## Comprehensive System Manual & Presentation Guide

> **Official Project Presentation Document**  
> *Prepared for Client Demonstrations, Investor Pitches, Academic Defense, and Operational Training.*

---

## 📋 Table of Contents
1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [Technology Stack & System Architecture](#2-technology-stack--system-architecture)
3. [Role-Based Access Control (RBAC) Architecture](#3-role-based-access-control-rbac-architecture)
4. [Complete Page-by-Page System Walkthrough](#4-complete-page-by-page-system-walkthrough)
   - [Public Storefront & Customer Portal](#a-public-storefront--customer-portal)
   - [Point of Sale & Cashier Financials](#b-point-of-sale--cashier-financials)
   - [Inventory, Warehousing & Procurement](#c-inventory-warehousing--procurement)
   - [Executive Governance & Administration](#d-executive-governance--administration)
5. [In-Depth Feature Deep-Dive: Cashier Shift & Sales Auditing](#5-in-depth-feature-deep-dive-cashier-shift--sales-auditing)
6. [Database Schema & Entity-Relationship Summary](#6-database-schema--entity-relationship-summary)
7. [Production Readiness & Security Highlights](#7-production-readiness--security-highlights)
8. [Presentation Q&A Defense Guide](#8-presentation-qa-defense-guide)

---

## 1. Executive Summary & Core Value Proposition

**Ngus Electronics (VoltTrack StockWise Enterprise)** is a production-grade, full-stack enterprise commerce and warehouse management platform. It seamlessly unifies:
1. **Luxury Customer E-Commerce Storefront**: A Rosa-inspired minimalist public boutique with full-screen dynamic hero slider, dark/light theme sync, instant bag checkout, live shipment tracking, and official PDF-style customer invoices.
2. **High-Speed Point of Sale (POS) Counter**: Barcode-ready sales terminal with real-time stock deduction, multi-tender payment processing, and customer receipt printing.
3. **Cashier Shift & Drawer Variance Auditing**: End-of-day register float deposits, continuous cash inflow tracking, cash-in/cash-out movement logs, counted cash reconciliation, and automated over/short variance fraud detection.
4. **End-to-End Warehousing & Supply Chain**: Multi-store stock balances, inter-branch transfers, supplier purchase orders (PO), Goods Received Notes (GRN), inventory shrinkage adjustments, and customer returns (RMA).
5. **Enterprise Security & Governance**: Strict 5-tier Role-Based Access Control (RBAC) powered by Laravel Sanctum token isolation.

### 🌟 Key Distinctions
- **Zero Mock Data**: 100% of products, categories, orders, customers, and financial audits are driven by live relational database records.
- **Ethiopian Payment Ecosystem**: Out-of-the-box support for **Telebirr**, **CBE Birr**, **Cash on Delivery / POS Cash**, **Direct Bank Wire**, and **Debit/Credit Cards**.
- **Data Isolation**: Cashiers are strictly isolated to viewing their own sales receipts, while Administrators and Operations Managers possess 360° store oversight.

---

## 2. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER TIERS                             │
│  Public Consumers  •  Store Cashiers  •  Managers  •  Administrators  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTPS / JSON REST API
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    REACT 18 SINGLE-PAGE APPLICATION                     │
│  • React Router DOM 6              • Context API (Auth & Cart)          │
│  • Vite Build Engine               • Theme Engine (CSS Custom Vars)     │
│  • Responsive Design System        • Zero-dependency SVG Icons          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Bearer Token (Sanctum)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       LARAVEL 11 REST API CORE                         │
│  • API Authentication (Sanctum)   • Role-Based Middleware Guards       │
│  • Eloquent ORM with Eager Loads   • Database Atomic Transactions       │
│  • Pessimistic Locking             • Model Cascade Safety & Auditing    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Engine
┌───────────────────────────────────▼────────────────────────────────────┐
│                      RELATIONAL DATABASE TIER                          │
│  • SQLite (Development) / MySQL / PostgreSQL (Production Compatible)   │
│  • Strict Foreign Key Constraints  • Decimal Financial Precision       │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 18.3, React Router v6, Vite 6, Custom Vanilla Design System (no slow heavy UI libraries; pure high-performance CSS with Glassmorphism and CSS variables).
- **Backend API**: PHP 8.2+ / Laravel 11, Laravel Sanctum Token Authentication, Form Request Validators, Eloquent ORM.
- **Security Protocols**: Role-based route middleware (`role:admin`, `role:manager`, `role:cashier`), parameterized SQL queries, password hashing (Bcrypt), CORS policy enforcement.

---

## 3. Role-Based Access Control (RBAC) Architecture

The application enforces a granular 5-tier role hierarchy. Each user account is strictly bound to a role stored in the `users.role` database column:

```
                  ┌──────────────────────┐
                  │ 👑 ADMINISTRATOR     │
                  │ (Complete Authority) │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│ 💼 OPERATIONS MANAGER │         │ 👤 CASHIER            │
│ (Inventory & POs)     │         │ (POS Sales & Shifts)  │
└───────────┬───────────┘         └───────────────────────┘
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│ 📦 STOREKEEPER        │         │ 🛍️ CUSTOMER           │
│ (Warehouse & GRN)     │         │ (Storefront & Orders) │
└───────────────────────┘         └───────────────────────┘
```

### RBAC Permission Matrix

| Feature / Resource Route | 👑 Admin | 💼 Manager | 👤 Cashier | 📦 Storekeeper | 🛍️ Customer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Storefront & Cart** (`/`, `/tracking`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Customer Portal & Invoices** (`/customer/dashboard`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POS Counter Terminal** (`/pos`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Cashier Shift Drawers** (`/shifts`) | ✅ | ✅ (Supervise) | ✅ (Own shift) | ❌ | ❌ |
| **Sales Ledger & Receipts** (`/sales`) | ✅ (All) | ✅ (All) | ✅ (Own sales) | ❌ | ❌ |
| **Executive Console** (`/dashboard`) | ✅ (Executive) | ✅ (Operations)| ❌ | ❌ | ❌ |
| **Catalog Management** (`/products`, `/categories`) | ✅ (Full) | ✅ (Create/Edit)| ❌ (Read only) | ❌ (Read only) | ❌ |
| **Inventory Balances & Stock** (`/balances`) | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Inbound Goods Receiving GRN** (`/goods-receipts`) | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Purchase Orders & Procurement** (`/purchase-orders`)| ✅ | ✅ | ❌ | ❌ | ❌ |
| **Stock Adjustments & Transfers** (`/adjustments`) | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Staff & User RBAC Accounts** (`/users`) | ✅ (Admin only) | ❌ (403 Blocked)| ❌ (403 Blocked) | ❌ (403 Blocked) | ❌ |
| **Finance, Tax & Currencies** (`/finance-settings`) | ✅ (Admin only) | ❌ (403 Blocked)| ❌ (403 Blocked) | ❌ (403 Blocked) | ❌ |
| **Destructive Hard Deletion (DELETE endpoints)** | ✅ (Admin only) | ❌ (403 Blocked)| ❌ (403 Blocked) | ❌ (403 Blocked) | ❌ |

---

## 4. Complete Page-by-Page System Walkthrough

### A. Public Storefront & Customer Portal

#### 1. Luxury Boutique Homepage (`/`)
- **Visual Design**: Inspired by minimalist luxury e-commerce (Rosa Aesthetic). Features an edge-to-edge rotating hero slider showcasing flagship electronics (Smartphones, Laptops, Audio, Displays).
- **Theme Synchronization**: 1-click Light / Dark mode toggle that persists across sessions and transitions smoothly across all visual elements.
- **Dynamic Catalog**: Sourced 100% from live backend database records. Supports category filtering, price badges in ETB, and stock availability tags.
- **Smart Cart Drawer**: Live shopping bag with Ethiopian currency calculations, item counters, and quick add buttons.

#### 2. Customer Dashboard & Orders Portal (`/customer/dashboard`)
- **Order History**: Real-time table of all past customer orders with order reference numbers, item counts, total ETB, fulfillment status, and order placement date.
- **Official Invoice Generator**: 1-click modal rendering an official VAT-compliant receipt with store header, tax calculations (15% VAT), and a print-ready button (`window.print()`).
- **Hardware Boutique Tab**: Allows registered clients to browse products and add items to their shopping bag directly inside their private dashboard.
- **Profile Management**: Update delivery address, phone number, and account information with live backend sync.

#### 3. Real-Time Consignment Tracking (`/tracking`)
- **Public Parcel Tracker**: Allows customers to input their order number (e.g. `ORD-0001`) or shipment consignment number to track shipping carriers, dispatch timestamps, and estimated arrival without requiring a staff login.

---

### B. Point of Sale & Cashier Financials

#### 4. Point of Sale Register (`/pos`)
- **Barcode & SKU Search**: Instant real-time search across products by SKU, name, or category.
- **Smart Cashier Cart**: Dynamic quantity increment/decrement, line-item totals, and automatic calculation of Ethiopian 15% VAT.
- **Multi-Tender Payments**: Accepts Telebirr, CBE Birr, Cash, Bank Transfer, or Debit Card. For cash transactions, the system computes the exact change due.
- **Instant Stock Sync**: Every completed sale atomically decrements the catalog inventory balance using database transactions (`DB::transaction` and `lockForUpdate`).

#### 5. Cashier Shift Drawers & Variance Reconciliation (`/shifts`)
- **Work Session Lifecycle**: Cashiers start their shift by logging their starting cash float (e.g. ETB 1,000.00).
- **Drawer Movements**: Logs petty cash expenses, change drops, or float additions with timestamps and audit descriptions.
- **Closing Drawer Count**: Cashiers physically count their drawer at close and enter the counted cash.
- **Variance Audit (Over / Short)**: System automatically compares `Expected Cash = Opening Float + Cash Sales + Inflows - Outflows` against `Counted Cash`. Any discrepancy is highlighted in red (shortage) or green (overage).

#### 6. Completed Sales & Cashier Performance Ledger (`/sales`)
- **🏆 Cashier Performance Leaderboard**: Ranked cards showing which cashier sold how much, total revenue (ETB), number of checkout receipts, average ticket size, and % share of store sales.
- **Cashier Filter Dropdown**: 1-click filtering allowing managers to inspect sales made by any specific staff member.
- **Audited Sales Table**: Displays Receipt ID, Attributed Cashier, Terminal Register Code, Customer Name, and Total Paid.
- **Receipt Modal**: Printable tax receipt showing the exact cashier who finalized the transaction.

---

### C. Inventory, Warehousing & Procurement

#### 7. Products & SKU Master (`/products`)
- Full catalog master listing SKU, brand, category, cost price, selling price, and stock on hand.
- Product creation and editing modal with image uploading and minimum stock warning threshold triggers.

#### 8. Category & Brand Taxonomy (`/categories`)
- Multi-tier product hierarchy with category icons, product counts, and active brand directory.

#### 9. Stock Balances & Warehouse Locations (`/balances`)
- Warehouse location breakdown: Main Retail Floor, Backroom Warehouse, Repair Facility.
- Tracks Quantity on Hand vs Quantity Reserved for pending orders.

#### 10. Purchase Orders & Procurement (`/purchase-orders`)
- Creation and tracking of supplier purchase orders with vendor contacts, agreed unit costs, expected arrival dates, and order status (Draft ➔ Sent ➔ Received).

#### 11. Inbound Goods Received Notes GRN (`/goods-receipts`)
- Receiving dock workflow: inspects inbound supplier deliveries against POs and automatically increments stock balances.

#### 12. Inter-Store Transfers & Stock Adjustments (`/transfers`, `/adjustments`)
- Stock relocation between branches and warehouses with conflict guards.
- Stock adjustments ledger for damaged goods, expired stock, or physical count discrepancies.

#### 13. Logistics & Package Shipments (`/shipments`)
- Dispatches orders into carrier consignments with tracking numbers, recipient addresses, and delivery milestones.

#### 14. Customer RMA Returns & Refunds (`/returns`)
- Handles return merchandise authorizations, reason codes (defective, wrong item), and customer refunds.

---

### D. Executive Governance & Administration

#### 15. Executive Command Dashboard (`/dashboard`)
- **Role-Tailored Perspectives**:
  - **Administrator View**: Executive console emphasizing total business turnover, inventory asset valuation, staff account distribution, and branch status.
  - **Manager View**: Operational floor console emphasizing restock alerts, pending order fulfillments, open cashier drawers, and daily retail targets.
- **Sales Trajectory Visualizer**: Interactive charting showing revenue trends across Today, 7 Days, 30 Days, or All Time.
- **Live Inventory Health**: Instant warnings for items nearing zero stock or completely out of stock.

#### 16. Staff User Management & Identity RBAC (`/users`)
- **Admin-Only Security Console**:
  - Full staff user list displaying Name, Email, Assigned Role (`admin`, `manager`, `cashier`, `storekeeper`), and Active status.
  - **Create Staff Member**: Secure modal to create new staff accounts with encrypted passwords (minimum 8 characters).
  - **Edit Staff & Role Promotion**: Update staff roles (e.g. promoting a cashier to manager), change contact details, or trigger password resets.
  - **Deactivate / Activate Account**: Instant 1-click kill switch to prevent terminated or suspended staff from logging into the POS or admin backend.
  - **Account Deletion Guard**: System strictly forbids an administrator from deleting their own active account, preventing accidental lockout.

#### 17. Finance, Tax & Currencies (`/finance-settings`)
- Configuration of store payment tenders (Telebirr, CBE Birr, Cash, Card, Bank Wire) and legal VAT rates (Ethiopian standard 15%).

---

## 5. In-Depth Feature Deep-Dive: Cashier Shift & Sales Auditing

### How Does the Admin Know "Which Cashier Sold How Much"?

```
                   ┌─────────────────────────────────────────┐
                   │             CASHIER LOGS IN             │
                   │      (e.g., Getacher Kifilie - ID 4)    │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │           OPENS REGISTER SHIFT          │
                   │   Starting Float: ETB 1,000.00 in cash  │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │         RINGS UP SALES AT POS           │
                   │  Sale #1: ETB 145,000  •  Sale #2: ETB  │
                   │  -> Sale.cashier_id = 4                 │
                   │  -> Sale.cashier_shift_id = Shift #3    │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │           END-OF-DAY COUNT-DOWN         │
                   │  Expected: Float + Cash Sales           │
                   │  Counted: Actual money in physical box  │
                   │  Variance: Counted - Expected           │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   ADMIN SALES LEDGER & LEADERBOARD                     │
│  • Rank 1: System Admin  - ETB 1,015,000.00 (4 sales)                  │
│  • Rank 2: Getacher K.   - ETB   290,000.00 (2 sales)                  │
│  • Rank 3: Abebe K.      - ETB   176,500.00 (1 sale)                   │
│  • Rank 4: Alemu K.      - ETB    38,000.00 (1 sale)                   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Database Attribution**:
   Every record in the `sales` table contains:
   - `cashier_id`: Direct foreign key to `users.id`.
   - `cashier_shift_id`: Direct foreign key to `cashier_shifts.id`.
   - `pos_register_id`: The hardware terminal code (`REG-01`).
2. **Frontend Audit Screen (`/sales`)**:
   The Admin simply navigates to **Sales & Cashier Ledger** in the sidebar. The top leaderboard displays every cashier's total revenue, receipt volume, and average basket size. Clicking on any cashier filters the ledger to show their exact transaction receipts.
3. **Drawer Discrepancy Detection (`/shifts`)**:
   Under **Cashier Shifts**, the Admin reviews every completed shift. If a cashier had ETB 5,000 in cash sales with a 1,000 float, the system expects ETB 6,000. If the cashier counts ETB 5,800, the system automatically flags a **red `-ETB 200.00` shortage**, preventing internal theft.

---

## 6. Database Schema & Entity-Relationship Summary

The relational database comprises over 25 tightly-coupled tables with referential integrity:

- **Authentication & RBAC**: `users`, `personal_access_tokens`, `password_resets`
- **Product Catalog**: `categories`, `brands`, `products`, `product_variants`, `product_images`, `units`
- **Warehousing & Stock**: `stores`, `stock_locations`, `stock_balances`, `stock_transactions`, `stock_transfers`, `stock_adjustments`
- **Procurement**: `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `supplier_payments`
- **Customers & Orders**: `customers`, `customer_addresses`, `orders`, `order_items`, `shipments`
- **POS & Financial Ledger**: `pos_registers`, `cashier_shifts`, `cash_movements`, `sales`, `sale_items`, `payment_methods`, `payments`, `tax_rates`, `sale_returns`, `sale_refunds`

---

## 7. Production Readiness & Security Highlights

1. **Security & Data Isolation**:
   - Cashiers cannot view colleagues' sales numbers or access sensitive warehouse costs.
   - All write and delete operations require authenticated Sanctum Bearer tokens.
   - SQL Injection immunity via Laravel Eloquent parameterized queries.
   - Cross-Site Scripting (XSS) immunity via React virtual DOM escaping.
2. **Data Consistency**:
   - Stock decrements and sales creations are wrapped in atomic database transactions (`DB::transaction`).
   - Concurrency conflicts are prevented using database row locks (`lockForUpdate`).
3. **Performance Optimization**:
   - Vite client-side bundle minification with gzip chunk compression.
   - REST API paginated endpoints (`per_page=15` / `50` / `100`) preventing server memory exhaustion.
   - Eager loading (`with(['customer', 'cashier', 'items'])`) preventing N+1 query bottlenecks.

---

## 8. Presentation Q&A Defense Guide

### Q1: "How does this platform prevent inventory overselling between online buyers and physical walk-in store customers?"
> **Answer**: Both the online checkout endpoint (`/api/checkout`) and the physical counter POS checkout (`/api/sales`) run through identical atomic database transactions with pessimistic locking (`lockForUpdate()`). When an online customer places an order, the stock is immediately moved to `quantity_reserved`. When a walk-in customer purchases at the counter, `quantity_on_hand` is decremented in real time. If a cashier tries to sell an item that was just purchased online, the system rejects the transaction with an instant notice: *"Insufficient stock available"*.

### Q2: "Can a cashier alter their sales history or erase cash drawer shortages?"
> **Answer**: No. Financial audits in the system are immutable. The `sales` and `cashier_shifts` tables have strict database constraints. Furthermore, the API endpoint forbids deleting any shift that is closed or reconciled (`status !== 'open'`). Discrepancies between expected cash and counted cash are permanently recorded as `closing_adjustment` records in `cash_movements`.

### Q3: "Why is there both an Admin and a Manager role, and how are they separated?"
> **Answer**: In real retail enterprises, a Store Manager needs to manage inventory, receive supplier goods, reorder stock, and supervise cashiers, but should **never** have the power to create other administrators, alter system tax configurations, access database maintenance, or permanently delete business audit records. Only the **Administrator** has access to Staff RBAC (`/users`), system-wide settings (`/finance-settings`), and destructive deletions.

### Q4: "How does the system support the local Ethiopian market?"
> **Answer**: The system includes native support for Ethiopian payment systems: **Telebirr**, **CBE Birr**, **Commercial Bank Wire**, and **Store Cash**, all denominated in **Ethiopian Birr (ETB)** with standard 15% VAT tax calculations built into every receipt and customer invoice.

---

*End of Presentation Manual • Ngus Electronics (VoltTrack StockWise Enterprise) v1.0 Production Release*
