# Inventory API

All endpoints use the `/api` prefix and return JSON. Log in to receive a Sanctum bearer token, then send it as `Authorization: Bearer <token>` with `Accept: application/json`.

## Authentication

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/login` | Public |
| POST | `/api/logout` | Authenticated |
| GET | `/api/user` | Authenticated |
| POST | `/api/admin/users` | Admin |
| POST | `/api/admin/users/create` | Admin (alias) |

Login accepts `email` and `password`. The response includes `token`, `token_type`, and the user's `id`, `name`, `email`, and `role`.

Admin user creation accepts `name`, `email`, `password`, `password_confirmation`, and `role`. Allowed roles are `manager`, `cashier`, and `storekeeper`; it returns `201 Created` and the new user's safe public fields.

## Role access

| Method | Endpoint | Admin | Manager | Cashier |
| --- | --- | --- | --- | --- |
| GET | `/api/categories` | Yes | Yes | No |
| GET | `/api/categories/{id}` | Yes | Yes | No |
| POST | `/api/categories` | Yes | No | No |
| PUT/PATCH | `/api/categories/{id}` | Yes | No | No |
| DELETE | `/api/categories/{id}` | Yes | No | No |
| GET | `/api/products` | Yes | Yes | No |
| GET | `/api/products/{id}` | Yes | Yes | No |
| POST | `/api/products` | Yes | Yes | No |
| PUT/PATCH | `/api/products/{id}` | Yes | Yes | No |
| DELETE | `/api/products/{id}` | Yes | No | No |
| GET | `/api/sales` | No | No | Own sales |
| GET | `/api/sales/{id}` | No | No | Own sale only |

Product creation requires `category_id`, `name`, `sku`, `cost_price`, `selling_price`, `quantity`, and `minimum_stock`. `brand` and `model_number` are optional. Product updates accept any subset of those fields. Category deletion returns `409` while products still use that category. Invalid input returns `422`; unauthenticated requests return `401`; role failures return `403`.

The sales API currently exposes sale summaries (`id`, `total_amount`, `created_at`) for the signed-in cashier. This project did not have a checkout or sale-creation workflow, so sales must be created by a future checkout flow or other trusted process before they appear here.