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

- `AUTH_SECRET` — 32+ characters
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

Create an account at `/register`, or use the seed user `demo@testerbridge.dev` / `Demo12345!`.

## First real campaign (after OAuth)

1. Sign in.
2. `/onboarding` — complete profile.
3. `/integrations` — Facebook Page OAuth, Gmail OAuth, Play service account (verified before Connected).
4. `/apps` — Sync My Apps or add `com.example.net360` manually.
5. Add Google Group `net360-testers@googlegroups.com`.
6. `/campaigns` — create **NET360 Closed Testing**, target 12, closed track, source, opt-in URL.
7. `/discovery` — last 24 hours. For a Facebook Group, **import the post text** (Groups API is gone).
8. `/opportunities` — Generate reply → edit if needed → **Approve & Post** (or copy if Group).
9. When they reply, paste the message. Confirm Gmail.
10. Add to Google Group (API or manual confirm).
11. Generate/send invitation with the **configured** testing link.
12. Record opt-in when they actually opt in in Play. Do not mark opted-in just because they were added.

## Production

Set `DEMO_MODE=false`. Demo seed data must not be applied to production. See [DEPLOYMENT.md](DEPLOYMENT.md).
