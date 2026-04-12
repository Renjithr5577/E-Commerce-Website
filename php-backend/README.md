# PHP Backend

This folder mirrors the main API with plain PHP + MySQL so the Angular app can run against PHP instead of Express when needed.

## What it uses

- PHP router entry: `php-backend/index.php`
- PHP dev-server router: `php-backend/router.php`
- Shared DB settings: `backend/.env` or environment variables
- Same MySQL schema: `backend/database/schema.sql`

## Run it

1. Import the schema first:

```sql
mysql -u root -p < backend/database/schema.sql
```

2. Make sure `backend/.env` contains the correct MySQL credentials.

3. Start the PHP API:

```powershell
php -S localhost:8000 php-backend/router.php
```

4. Point the Angular app to PHP by editing `frontend/public/runtime-config.js`:

```js
window.__LUXECART_API_URL__ = 'http://localhost:8000/api';
```

5. Restart the Angular dev server after changing the runtime config file.

## Endpoints mirrored

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `GET /api/admin/overview`
- `GET /api/admin/orders/:orderId`
- `GET /api/orders/latest?email=...`
- `GET /api/orders/recent-products?email=...`
- `POST /api/orders`
- `GET /api/support?email=...`
- `POST /api/support`
- `PATCH /api/admin/support/:ticketId`
