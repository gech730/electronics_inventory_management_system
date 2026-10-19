<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel
# Electronics Inventory Management System

A Laravel application for managing inventory, categories, staff accounts, and sales. It includes a web interface and a JSON API.

## Requirements

- PHP 8.3 or later
- Composer
- Node.js and npm

The default local database is SQLite. You can use another supported Laravel database by updating the `DB_*` values in `.env`.

## Local Setup

From the repository root, install dependencies and create your environment file:

```bash
composer install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Create the SQLite database file if it does not already exist, then generate the app key and run migrations and seeders:

```powershell
New-Item -ItemType File -Force database/database.sqlite
php artisan key:generate
php artisan migrate --seed
```

On macOS/Linux, use `touch database/database.sqlite` to create the SQLite database file.

Install frontend dependencies and start the development processes in separate terminals:

```bash
npm install
npm run dev
```

```bash
php artisan serve
```

Open [http://localhost:8000](http://localhost:8000). Vite serves and rebuilds frontend assets while `npm run dev` is running. To create a production asset build, run `npm run build`.

## Seed Accounts

`php artisan migrate --seed` runs `DatabaseSeeder`, which creates `test@gmail.com` with the factory's default password `password`.

To create the admin account defined by `AdminUserSeeder`, run:

```bash
php artisan db:seed --class=AdminUserSeeder
```

That seeder currently creates `admin@gmail.com` with password `admin123`. These are development credentials only; change them before using a non-local environment. The admin seeder uses `User::create`, so it will fail if run again after the same email has already been inserted.

## Routes

Web routes are session-authenticated where noted. API routes are under the `/api` prefix; all API routes except login require a Sanctum-authenticated request unless otherwise noted.

### Web

| Method | Path | Access |
| --- | --- | --- |
| GET, POST | `/login` | Public; POST is guest-only |
| POST | `/logout` | Authenticated |
| GET | `/dashboard` | Authenticated |
| GET | `/admin/users/create` | Admin |
| GET | `/categories` | Admin, manager, cashier |
| GET | `/products` | Admin, manager, cashier |
| GET | `/categories/create` | Admin, manager |
| POST | `/categories` | Admin, manager |
| GET | `/products/create` | Admin, manager |
| POST | `/products` | Admin, manager |
| GET | `/admin/users` | Admin |

| POST | `/admin/users` | Admin |

### API

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/login` | Public |
| POST | `/api/logout` | Sanctum-authenticated |
| GET | `/api/user` | Sanctum-authenticated |
| GET | `/api/categories` | Admin, manager |
| GET | `/api/categories/{category}` | Admin, manager |
| POST | `/api/categories` | Admin |
| PUT, PATCH | `/api/categories/{category}` | Admin |
| DELETE | `/api/categories/{category}` | Admin |
| GET | `/api/products` | Admin, manager |
| GET | `/api/products/{product}` | Admin, manager |
| POST | `/api/products` | Admin, manager |
| PUT, PATCH | `/api/products/{product}` | Admin, manager |
| DELETE | `/api/products/{product}` | Admin |
| POST | `/api/admin/users` | Admin |
| POST | `/api/admin/users/create` | Admin (alias) |
| GET | `/api/sales` | Cashier |
| GET | `/api/sales/{sale}` | Cashier |

To inspect the routes registered by the current application, run:

```bash
php artisan route:list
```

## Contributing

1. Create a focused branch for your change.
2. Keep changes scoped, follow the existing Laravel and frontend conventions, and add or update tests for behavior changes.
3. Run the test suite with `composer test` before opening a pull request.
4. Include a concise summary, verification steps, and any database migration or environment changes in the pull request.

Do not commit `.env`, local database files, credentials, or generated dependencies. Never use the development seed credentials outside a local environment.


