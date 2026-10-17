<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\Admin\UserController;

Route::get('/register', [AuthController::class, 'showRegister']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/login', [AuthController::class, 'showLogin'])
    ->name('login');
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('guest');
Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth');

Route::get('/dashboard', function () {
    return view('dashboard.index');
})->middleware('auth');



Route::middleware(['auth', 'role:admin,manager'])
    ->group(function () {

Route::get('/categories/create', [CategoryController::class, 'create'])
    ->name('categories.create');
Route::post('/categories', [CategoryController::class, 'store'])
    ->name('categories.store');


Route::get('/products/create', [ProductController::class, 'create'])
    ->name('products.create');

Route::post('/products', [ProductController::class, 'store'])
    ->name('products.store');

    });


// All authenticated staff can view categories and products.
Route::middleware(['auth', 'role:admin,manager,cashier'])
    ->group(function () {
        Route::get('/categories', [CategoryController::class, 'index'])
            ->name('categories.index');

        Route::get('/products', [ProductController::class, 'index'])
            ->name('products.index');
    
    });


Route::middleware(['auth', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/users', [UserController::class, 'index'])
            ->name('users.index');

        Route::get('/users/create', [UserController::class, 'create'])
            ->name('users.create');

        Route::post('/users', [UserController::class, 'store'])
            ->name('users.store');
    });