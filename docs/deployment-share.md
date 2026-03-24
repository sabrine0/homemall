# HomeMall Share Deployment

Use this when you need a live URL for your manager/client demo.

This setup serves:
- Web app on `/`
- API on `/api`
- Uploads on `/uploads`

All behind one hostname, which keeps auth/cookies stable.

## 1) Prepare env

From repo root:

```powershell
Copy-Item .env.share.example .env.share
```

Edit `.env.share`:
- set `JWT_SECRET` to a strong random value
- set `APP_ORIGIN` to your real URL (or `http://localhost` for local smoke test)

## 2) Start stack

```powershell
docker compose --env-file .env.share -f docker-compose.share.yml up -d --build
```

## 3) Run migrations + seed

```powershell
docker compose --env-file .env.share -f docker-compose.share.yml exec api pnpm --filter @homemall/api prisma:deploy
docker compose --env-file .env.share -f docker-compose.share.yml exec api pnpm --filter @homemall/api prisma:seed
```

## 4) Verify

- Open app: `http://localhost` (or your server domain/IP)
- Health: `http://localhost/health`
- API docs: `http://localhost/api/docs`

## 5) Share externally

Use one of these:
- Host on a VM with public IP and open port `80`
- Put a domain + reverse proxy in front of the same stack
- Optional TLS:
  - terminate HTTPS at your external proxy/load balancer
  - keep `APP_ORIGIN=https://your-domain`

## 6) Stop

```powershell
docker compose --env-file .env.share -f docker-compose.share.yml down
```

## Mobile demo build (optional)

If your manager needs mobile binary:

```powershell
cd apps/mobile
flutter build apk --release --dart-define=API_BASE_URL=https://your-domain/api
```

APK output:
- `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`
