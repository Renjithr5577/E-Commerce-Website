# E-Commerce Website

Full-stack starter built with Angular, Bootstrap, MySQL, and two backend options: Express or PHP.

## What is included

- Angular storefront with product search, category filters, featured products, and a live cart
- Bootstrap-based responsive UI
- Express API with MySQL queries
- Optional PHP + MySQL API mirror for the same Angular frontend
- MySQL schema and seeded sample products
- Root script to run frontend and backend together

## Project structure

- `frontend/` Angular app
- `backend/` Express + MySQL API
- `php-backend/` PHP + MySQL API
- `backend/database/schema.sql` database schema and seed data

## Quick setup

1. Create the database and seed products:

```sql
mysql -u root -p < backend/database/schema.sql
```

2. Create your environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

3. Edit `backend/.env` with your MySQL password if needed.

4. Start both apps from the project root:

```powershell
npm run dev
```

## Local URLs

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000/api/products`
- Health check: `http://localhost:3000/api/health`

## Switch Frontend Between Express and PHP

The Angular app now reads its API URL from `frontend/public/runtime-config.js`.

- Express: `window.__LUXECART_API_URL__ = 'http://localhost:3000/api';`
- PHP: `window.__LUXECART_API_URL__ = 'http://localhost:8000/api';`

After changing that file, restart the Angular dev server.

## PHP Backend Option

If you want to use PHP instead of Express:

1. Keep the same MySQL schema from `backend/database/schema.sql`.
2. Make sure `backend/.env` has the correct database credentials.
3. Start the PHP router:

```powershell
php -S localhost:8000 php-backend/router.php
```

More details are in `php-backend/README.md`.

## Useful commands

```powershell
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
```
