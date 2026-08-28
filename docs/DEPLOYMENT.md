# Deployment (Vercel)

TesterBridge is a Next.js App Router app. Vercel runs `vercel-build`, which generates the Prisma client, applies migrations, then builds Next.js.

## 1. Import the GitHub repo

1. Open [vercel.com/new](https://vercel.com/new)
2. Import `shanu222/App-tester`
3. Framework Preset: **Next.js** (auto-detected)
4. Node.js: **24.x**

Do not override the build command. Vercel will run:

```bash
prisma generate && prisma migrate deploy && next build
```

## 2. Add PostgreSQL

In the Vercel project: **Storage → Create Database → Postgres** (or attach [Neon](https://neon.tech) / Supabase).

TesterBridge accepts any of these names (no extra rename required):

- `DATABASE_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL`
- Unpooled: `DIRECT_URL` / `POSTGRES_URL_NON_POOLING` / `DATABASE_URL_UNPOOLED`

Mark the variable **Available for Production, Preview, and Build**. Runtime-only vars are invisible to `prisma migrate deploy`.

## 3. Production environment variables

Set these in Vercel → Settings → Environment Variables for **Production** (and Preview if you use OAuth there):

```
DEMO_MODE=false
APP_URL=https://app-tester-three.vercel.app
ENCRYPTION_KEY=<64 hex chars: openssl rand -hex 32>
CRON_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DATABASE_URL=<pooled — keep Neon value>
DIRECT_URL=<direct — keep Neon value>
```

SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) are already configured on this Vercel project. Do not rename, remove, or expose them. Do not add `NEXT_PUBLIC_` copies.

Optional OAuth (not a login):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=https://YOUR-PROJECT.vercel.app/api/integrations/facebook/callback
```

`CRON_SECRET` is required. Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when that variable exists.

Never set Facebook/Google/Play passwords. Never enable `DEMO_MODE` in production.

## 4. Deploy

Push to `main`. The first build applies `prisma/migrations`. After deploy, confirm `/api/health` returns `{ "ok": true }`.

## 5. OAuth redirect URLs

Add the production origin in Google Cloud and Meta:

- `https://YOUR-PROJECT.vercel.app/api/integrations/gmail/callback`
- `https://YOUR-PROJECT.vercel.app/api/integrations/facebook/callback`

Meta App Dashboard also needs the Privacy Policy URL: `https://YOUR-PROJECT.vercel.app/privacy`

## Cron

`vercel.json` schedules:

- `GET /api/cron/tick` at `0 0 * * *` (daily job runner)
- `GET /api/cron/daily-testing-summary` at `*/15 * * * *` (checks each developer’s selected frequency, time, weekday, and timezone)

Both endpoints require `CRON_SECRET`. Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when that variable exists. Unauthenticated callers cannot trigger the daily summary.

On **Pro**, the job runner (`/api/cron/tick`) can run more often:

```json
"schedule": "*/15 * * * *"
```

Keep `/api/cron/daily-testing-summary` at `*/15 * * * *` so each developer’s local schedule is honored. The default remains Daily at 16:00 Asia/Karachi. Intervals under a day require Vercel Pro.

Jobs are idempotent and time out at 25s (serverless-safe). This is not a persistent worker. For high volume, run the same queue against the same database from an external worker.

## Local vs Vercel builds

- Local: `npm run build` → `prisma generate && next build` (no live database required)
- Vercel: `npm run vercel-build` → generate + migrate + next build
