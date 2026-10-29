<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiAuthController;
use App\Http\Controllers\Api\Admin\UserController as ApiUserController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\StockLocationController;
use App\Http\Controllers\Api\StockBalanceController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\GoodsReceiptController;
use App\Http\Controllers\Api\SupplierPaymentController;
use App\Http\Controllers\Api\StockTransferController;
use App\Http\Controllers\Api\StockAdjustmentController;
use App\Http\Controllers\Api\StockTransactionController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\PosRegisterController;
use App\Http\Controllers\Api\CashierShiftController;
use App\Http\Controllers\Api\CashMovementController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TaxRateController;
use App\Http\Controllers\Api\SaleReturnController;
use App\Http\Controllers\Api\SaleRefundController;

Route::post('/login', [ApiAuthController::class, 'login']);

// Public routes (catalog, stores, locations, units browsing)
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/brands/{brand}', [BrandController::class, 'show']);

// Warehousing public read routes
Route::get('/units', [UnitController::class, 'index']);
Route::get('/units/{unit}', [UnitController::class, 'show']);
Route::get('/stores', [StoreController::class, 'index']);
Route::get('/stores/{store}', [StoreController::class, 'show']);
Route::get('/stock-locations', [StockLocationController::class, 'index']);
Route::get('/stock-locations/{stockLocation}', [StockLocationController::class, 'show']);
Route::get('/stock-balances', [StockBalanceController::class, 'index']);
Route::get('/stock-balances/{stockBalance}', [StockBalanceController::class, 'show']);

// Procurement public read routes
Route::get('/suppliers', [SupplierController::class, 'index']);
Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);
Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
Route::get('/goods-receipts', [GoodsReceiptController::class, 'index']);
Route::get('/goods-receipts/{goodsReceipt}', [GoodsReceiptController::class, 'show']);
Route::get('/supplier-payments', [SupplierPaymentController::class, 'index']);
Route::get('/supplier-payments/{supplierPayment}', [SupplierPaymentController::class, 'show']);

// Inventory Operations public read routes
Route::get('/stock-transfers', [StockTransferController::class, 'index']);
Route::get('/stock-transfers/{stockTransfer}', [StockTransferController::class, 'show']);
Route::get('/stock-adjustments', [StockAdjustmentController::class, 'index']);
Route::get('/stock-adjustments/{stockAdjustment}', [StockAdjustmentController::class, 'show']);
Route::get('/stock-transactions', [StockTransactionController::class, 'index']);
Route::get('/stock-transactions/{stockTransaction}', [StockTransactionController::class, 'show']);

// Customer & Multi-Channel Order public read routes
Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/customers/{customer}', [CustomerController::class, 'show']);
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/{order}', [OrderController::class, 'show']);
Route::get('/shipments', [ShipmentController::class, 'index']);
Route::get('/shipments/{shipment}', [ShipmentController::class, 'show']);

// POS, Cash Drawer, and Financial public read routes
Route::get('/pos-registers', [PosRegisterController::class, 'index']);
Route::get('/pos-registers/{posRegister}', [PosRegisterController::class, 'show']);
Route::get('/cashier-shifts', [CashierShiftController::class, 'index']);
Route::get('/cashier-shifts/{cashierShift}', [CashierShiftController::class, 'show']);
Route::get('/cash-movements', [CashMovementController::class, 'index']);
Route::get('/cash-movements/{cashMovement}', [CashMovementController::class, 'show']);
Route::get('/payment-methods', [PaymentMethodController::class, 'index']);
Route::get('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'show']);
Route::get('/payments', [PaymentController::class, 'index']);
Route::get('/payments/{payment}', [PaymentController::class, 'show']);
Route::get('/tax-rates', [TaxRateController::class, 'index']);
Route::get('/tax-rates/{taxRate}', [TaxRateController::class, 'show']);

// Sales Returns & Customer Refunds public read routes
Route::get('/sale-returns', [SaleReturnController::class, 'index']);
Route::get('/sale-returns/{saleReturn}', [SaleReturnController::class, 'show']);
Route::get('/sale-refunds', [SaleRefundController::class, 'index']);
Route::get('/sale-refunds/{saleRefund}', [SaleRefundController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [ApiAuthController::class, 'logout']);
    Route::get('/user', [ApiAuthController::class, 'user']);

    // Shift management, drawer movements, and payment collections (Available to all authorized staff)
    Route::post('/cashier-shifts', [CashierShiftController::class, 'store']);
    Route::match(['put', 'patch'], '/cashier-shifts/{cashierShift}', [CashierShiftController::class, 'update']);
    Route::post('/cash-movements', [CashMovementController::class, 'store']);
    Route::post('/payments', [PaymentController::class, 'store']);

    // Admin & Manager management routes
    Route::middleware('role:admin,manager')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/images', [ProductController::class, 'uploadImage']);
        Route::delete('/product-images/{productImage}', [ProductController::class, 'deleteImage']);
        Route::post('/brands', [BrandController::class, 'store']);
        Route::match(['put', 'patch'], '/brands/{brand}', [BrandController::class, 'update']);

        // Warehousing & store operations
        Route::post('/units', [UnitController::class, 'store']);
        Route::match(['put', 'patch'], '/units/{unit}', [UnitController::class, 'update']);
        Route::post('/stores', [StoreController::class, 'store']);
        Route::match(['put', 'patch'], '/stores/{store}', [StoreController::class, 'update']);
        Route::post('/stock-locations', [StockLocationController::class, 'store']);
        Route::match(['put', 'patch'], '/stock-locations/{stockLocation}', [StockLocationController::class, 'update']);
        Route::post('/stock-balances', [StockBalanceController::class, 'store']);
        Route::match(['put', 'patch'], '/stock-balances/{stockBalance}', [StockBalanceController::class, 'update']);

        // Procurement operations
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::match(['put', 'patch'], '/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::match(['put', 'patch'], '/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update']);
        Route::post('/goods-receipts', [GoodsReceiptController::class, 'store']);
        Route::post('/supplier-payments', [SupplierPaymentController::class, 'store']);
        Route::match(['put', 'patch'], '/supplier-payments/{supplierPayment}', [SupplierPaymentController::class, 'update']);

        // Inventory movements & adjustments
        Route::post('/stock-transfers', [StockTransferController::class, 'store']);
        Route::match(['put', 'patch'], '/stock-transfers/{stockTransfer}', [StockTransferController::class, 'update']);
        Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store']);
        Route::match(['put', 'patch'], '/stock-adjustments/{stockAdjustment}', [StockAdjustmentController::class, 'update']);
        Route::post('/stock-transactions', [StockTransactionController::class, 'store']);

        // Customer & Order operations
        Route::post('/customers', [CustomerController::class, 'store']);
        Route::match(['put', 'patch'], '/customers/{customer}', [CustomerController::class, 'update']);
        Route::post('/customers/{customer}/addresses', [CustomerController::class, 'storeAddress']);
        Route::match(['put', 'patch'], '/customers/{customer}/addresses/{address}', [CustomerController::class, 'updateAddress']);
        Route::delete('/customers/{customer}/addresses/{address}', [CustomerController::class, 'destroyAddress']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::match(['put', 'patch'], '/orders/{order}', [OrderController::class, 'update']);
        Route::post('/shipments', [ShipmentController::class, 'store']);
        Route::match(['put', 'patch'], '/shipments/{shipment}', [ShipmentController::class, 'update']);

        // POS Configuration, Payment Methods, and Tax Management
        Route::post('/pos-registers', [PosRegisterController::class, 'store']);
        Route::match(['put', 'patch'], '/pos-registers/{posRegister}', [PosRegisterController::class, 'update']);
        Route::post('/payment-methods', [PaymentMethodController::class, 'store']);
        Route::match(['put', 'patch'], '/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
        Route::post('/tax-rates', [TaxRateController::class, 'store']);
        Route::match(['put', 'patch'], '/tax-rates/{taxRate}', [TaxRateController::class, 'update']);
        Route::match(['put', 'patch'], '/payments/{payment}', [PaymentController::class, 'update']);

        // Sales Returns & Customer Refunds management
        Route::post('/sale-returns', [SaleReturnController::class, 'store']);
        Route::match(['put', 'patch'], '/sale-returns/{saleReturn}', [SaleReturnController::class, 'update']);
        Route::post('/sale-refunds', [SaleRefundController::class, 'store']);
        Route::match(['put', 'patch'], '/sale-refunds/{saleRefund}', [SaleRefundController::class, 'update']);
    });

    // Admin-only management & deletion routes
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/users', [ApiUserController::class, 'index']);
        Route::post('/admin/users', [ApiUserController::class, 'store']);

        Route::post('/categories', [CategoryController::class, 'store']);
        Route::match(['put', 'patch'], '/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);

        // Warehousing deletions with conflict guards
        Route::delete('/units/{unit}', [UnitController::class, 'destroy']);
        Route::delete('/stores/{store}', [StoreController::class, 'destroy']);
        Route::delete('/stock-locations/{stockLocation}', [StockLocationController::class, 'destroy']);
        Route::delete('/stock-balances/{stockBalance}', [StockBalanceController::class, 'destroy']);

        // Procurement deletions
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);
        Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy']);

        // Inventory deletions
        Route::delete('/stock-transfers/{stockTransfer}', [StockTransferController::class, 'destroy']);
        Route::delete('/stock-adjustments/{stockAdjustment}', [StockAdjustmentController::class, 'destroy']);

        // Order & Customer deletions
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/orders/{order}', [OrderController::class, 'destroy']);
        Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy']);

        // POS & Financial deletions
        Route::delete('/pos-registers/{posRegister}', [PosRegisterController::class, 'destroy']);
        Route::delete('/cashier-shifts/{cashierShift}', [CashierShiftController::class, 'destroy']);
        Route::delete('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);
        Route::delete('/payments/{payment}', [PaymentController::class, 'destroy']);
        Route::delete('/tax-rates/{taxRate}', [TaxRateController::class, 'destroy']);

        // Sales Returns & Refunds deletions
        Route::delete('/sale-returns/{saleReturn}', [SaleReturnController::class, 'destroy']);
        Route::delete('/sale-refunds/{saleRefund}', [SaleRefundController::class, 'destroy']);
    });

    // Cashier routes
    Route::middleware('role:cashier')->group(function () {
        Route::get('/sales', [SaleController::class, 'index']);
        Route::post('/sales', [SaleController::class, 'store']);
        Route::get('/sales/{sale}', [SaleController::class, 'show']);
    });
});