# HomeMall API Guide

Base URL: `http://localhost:4000`
Swagger UI: `http://localhost:4000/api/docs`

## Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Profile

- `POST /api/profile`
- `GET /api/profile`

## Zones

- `GET /api/zones`
- `GET /api/zones/:id`

## Analysis

- `POST /api/analyze/zones`
- `POST /api/analyze/tcl`
- `POST /api/analyze/compare`

## Reports

- `GET /api/report`
- `GET /api/report/pdf`

## Notes

- Web uses httpOnly cookie auth.
- Mobile uses Bearer token from login/signup response.
- Inputs should follow validation rules in `apps/api/src/utils/validation.ts`.

## Admin Backoffice (RBAC)

- Roles:
  - `SUPER_ADMIN`: full control (admins, users, listings, settings, imports)
  - `MANAGER`: scoped permissions (listings, users, reports; optional extra perms)
- Main endpoints:
  - `POST /api/admin/login`
  - `GET /api/admin/dashboard`
  - `GET /api/admin/listings`
  - `PATCH /api/admin/listings/:id/status`
  - `DELETE /api/admin/listings/:id`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id`
  - `GET /api/admin/admins` (super admin)
  - `POST /api/admin/admins` (super admin)
  - `PATCH /api/admin/admins/:id` (super admin)
  - `GET /api/admin/settings`
  - `PUT /api/admin/settings/:key`
  - `POST /api/admin/import`
  - `POST /api/admin/import/refresh`

## External Listing Ingestion

- Supported live sources: `avito`, `mubawab` (plus `generic` feed import).
- Ingestion target: real records in `UserListing` (not zone metadata placeholders).
- Run manual refresh:
  - `pnpm --filter @homemall/api marketplace:refresh`
- Optional scheduler (API server startup):
  - `EXTERNAL_INGESTION_ENABLED=true`
  - `EXTERNAL_INGESTION_INTERVAL_MINUTES=360`
  - `EXTERNAL_INGESTION_MAX_ROWS=120`
  - `EXTERNAL_INGESTION_DEACTIVATE_MISSING=true`
