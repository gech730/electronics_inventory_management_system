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

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [ApiAuthController::class, 'logout']);
    Route::get('/user', [ApiAuthController::class, 'user']);

    // Admin & Manager management routes
    Route::middleware('role:admin,manager')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
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
    });

    // Cashier routes
    Route::middleware('role:cashier')->group(function () {
        Route::get('/sales', [SaleController::class, 'index']);
        Route::post('/sales', [SaleController::class, 'store']);
        Route::get('/sales/{sale}', [SaleController::class, 'show']);
    });
});