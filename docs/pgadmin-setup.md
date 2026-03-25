# pgAdmin Setup

HomeMall needs a PostgreSQL database with the Prisma schema applied and the seed data inserted.

## What gets created

- all application tables from `apps/api/prisma/schema.prisma`
- 15 starter Morocco zones with metrics
- a default super admin account

## Create the database in pgAdmin

1. Open the Query Tool on your Postgres server.
2. Run [`create-db.sql`](../create-db.sql).
3. Connect to the new `homemall` database.

## Recommended bootstrap from the repo

After the empty database exists, run this from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-remote-db.ps1 `
  -DatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/homemall?schema=public" `
  -SuperAdminEmail "admin@homemall.local" `
  -SuperAdminPassword "Admin12345!"
```

This applies all Prisma migrations and seeds the admin user plus starter zones.

## Manual schema import in pgAdmin

If you want to create the tables from pgAdmin first, run [`homemall-schema.sql`](../homemall-schema.sql) inside the `homemall` database.

You still need the seed step after that if you want the default admin account and starter zone data.

## Production deploy note

If your production stack should use this external database, set `DATABASE_URL` in Coolify. `docker-compose.prod.yml` now supports that override for both `api` and `migrate`.
