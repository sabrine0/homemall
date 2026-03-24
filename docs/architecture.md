# HomeMall Architecture

## Monorepo layout

- `apps/api`: Node.js + Express + Prisma API
- `apps/web`: Next.js 14 web client
- `apps/mobile`: Flutter mobile client
- `packages/shared`: shared types/constants/utils
- `packages/scoring`: transparent scoring and TCL engine
- `docker/`: compose and Dockerfiles
- `docs/`: API and architecture documentation

## Runtime flow

1. User authenticates with `POST /api/auth/login` or `POST /api/auth/signup`.
2. API returns JWT token and sets httpOnly cookie for web.
3. Onboarding profile is stored in `UserProfile` via `POST /api/profile`.
4. `packages/scoring` computes:
   - zone score breakdown
   - true cost of living (TCL)
   - 5Y/10Y outlook
5. API endpoints expose analysis outputs to both web and mobile.
6. Report endpoints generate JSON + PDF export.

## Scoring notes

- All indices are normalized to `0..1`.
- Weight map changes by user goal (`rent`, `buy`, `invest`, etc).
- Sensitivity penalties are applied to pollen/noise/heat.
- Climate/zoning penalties reduce total score and future outlook growth.

## Data model

Core entities:

- `User`
- `UserProfile`
- `Zone`
- `ZoneMetrics`
- `AnalysisResult`

See `apps/api/prisma/schema.prisma` for full schema.
