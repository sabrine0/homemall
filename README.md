# HomeMall

HomeMall is an AI decision platform for housing with:

- Web app: Next.js 14 + TypeScript + Tailwind
- Mobile app: Flutter
- Backend API: Node.js + Express + Prisma + PostgreSQL

## Monorepo

```
homemall/
  apps/
    api/
    web/
    mobile/
  packages/
    shared/
    scoring/
  docs/
  docker/
```

## Features

- Guest-first access: explore zones, details, TCL, and compare without login
- AI real-estate search endpoint (`POST /api/search/ai`) with rule-based query parsing + explainable ranking
- JWT authentication (httpOnly cookie for web + bearer token support for mobile)
- Admin import supports `source: "generic" | "avito"` with listing/image metadata mapping
- Onboarding profile capture
- Zone list/map/detail analysis
- True Cost of Living (TCL) compare
- Option comparison
- Decision report JSON + PDF export
- Swagger docs and Postman collection

## Architecture

Core backend flows now follow layered boundaries:

- `domain/`: pure business logic (query parsing, class-based scoring/TCL models)
- `application/`: use-cases (AI search orchestration)
- `infrastructure/`: repositories and persistence adapters (Prisma zone analysis repository)
- `presentation/`: HTTP controllers/routes

Shared contracts and schemas are centralized in `packages/shared` and consumed by API + web + mobile.

## Migration Notes

- Audit fields (`createdAt`, `updatedAt`) for `Zone` and `ZoneMetrics` are now included in Prisma migrations.

## Environment

- API env: `apps/api/.env.example`
- Web env: `apps/web/.env.example`
- Mobile env: `apps/mobile/.env.example`

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start infrastructure:

```bash
docker compose up -d
```

3. Run Prisma migrate + seed:

```bash
pnpm --filter @homemall/api prisma:generate
pnpm --filter @homemall/api prisma:migrate
pnpm --filter @homemall/api prisma:seed
```

4. Start web + API dev servers:

```bash
pnpm dev
```

5. Run mobile app:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

## Access URLs

- Web app: `http://localhost:3000` (or `http://localhost:3001` if `3000` is already in use)
- API health: `http://localhost:4000/health`
- API docs (Swagger): `http://localhost:4000/api/docs`

## Mobile API URL tips

- Flutter web/chrome:
```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000
```
- Android emulator:
```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

If you previously set `API_BASE_URL=http://10.0.2.2:4000` while running on web, signup/login requests will fail in the browser.

## Workspace scripts

- `pnpm dev`
- `pnpm build`
- `pnpm lint`

## Avito-Aligned Import

- Endpoint: `POST /api/admin/import`
- Payload:
  - `source`: `"avito"` (or `"generic"`)
  - `format`: `"csv"` or `"json"`
  - `content`: raw CSV/JSON rows
- Template: `docs/avito-import-template.json`
- Ready multi-city sample: `docs/avito-import-morocco.json`
- Live Avito snapshot (real listings + multi images): `docs/avito-import-live.json`
- Refresh and import latest snapshot directly into DB:

```bash
pnpm --filter @homemall/api avito:snapshot
```
- Recommended Avito row fields:
  - `city`, `name` (or `title`)
  - `url`, `sourceListingId`
  - `imageUrl` (and optional `imageUrls`)
  - `listingPurpose`, `listingType`, `price`, `areaM2`, `bedrooms`, `bathrooms`

## Currency

- HomeMall pricing is configured for Moroccan Dirham (`DH`) in web + mobile UI.

## Docker

- Root compose: `docker-compose.yml`
- Alternate compose path: `docker/docker-compose.yml`
- Dockerfiles: `docker/api.Dockerfile`, `docker/web.Dockerfile`
- Share/demo deployment runbook: `docs/deployment-share.md`

## Share Deployment Quick Commands

```bash
cp .env.share.example .env.share
# edit .env.share (JWT_SECRET + APP_ORIGIN)
pnpm share:up
pnpm share:migrate
pnpm share:seed
```
