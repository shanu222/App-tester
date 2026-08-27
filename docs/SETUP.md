# Setup

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (Docker Compose is included)
- npm 10+

## Local database

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with user/password/database `testerbridge`.

## Environment

```bash
copy .env.example .env.local
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set:

- `ENCRYPTION_KEY` — 64 hex characters
- `CRON_SECRET` — random string
- `DATABASE_URL` — already set for Compose
- `DEMO_MODE=true` for local mock adapters

## Migrate and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Run

```bash
npm run dev
```

Open http://localhost:3000. There is no login — the dashboard opens immediately.

## First real campaign (after optional OAuth)

1. `/onboarding` — complete profile.
2. `/play` — connect Play Console with Google OAuth or a service account (verified before Connected), then **Refresh apps** and select an app.
3. `/apps` — Sync My Apps or add `com.example.net360` manually.
4. `/campaigns` — create **NET360 Closed Testing**, target 12, closed track, source, opt-in URL.
5. `/discovery` — last 24 hours. For a Facebook Group, **import the post text** (Groups API is gone).
6. `/opportunities` — Generate reply → edit if needed → **Approve & Post** (or copy if Group).
7. When they reply, paste the message. Confirm Gmail.
8. Grant testing access. Open testing completes automatically; internal/closed shows the Play Console step, then confirm the add.
9. Generate/send invitation with the **configured** testing link.
10. Record opt-in when they actually opt in in Play. Do not mark opted-in just because they were added.

## Production

Set `DEMO_MODE=false`. Demo seed data must not be applied to production. See [DEPLOYMENT.md](DEPLOYMENT.md).
