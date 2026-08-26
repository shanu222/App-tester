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

Set both:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string (add `?pgbouncer=true` if the host is a pooler) |
| `DIRECT_URL` | Direct / unpooled connection string (required for `prisma migrate deploy`) |

If `DIRECT_URL` is missing or empty, the Vercel build copies `DATABASE_URL` into it so Prisma can migrate. For Neon/Supabase poolers, still set a real unpooled `DIRECT_URL` when you can.

## 3. Production environment variables

Set these in Vercel → Settings → Environment Variables for **Production** (and Preview if you use OAuth there):

```
DEMO_MODE=false
APP_URL=https://YOUR-PROJECT.vercel.app
AUTH_URL=https://YOUR-PROJECT.vercel.app
AUTH_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<64 hex chars: openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
DATABASE_URL=<pooled>
DIRECT_URL=<direct>
```

Optional OAuth:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://YOUR-PROJECT.vercel.app/api/auth/callback/google
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

- `https://YOUR-PROJECT.vercel.app/api/auth/callback/google`
- `https://YOUR-PROJECT.vercel.app/api/integrations/gmail/callback`
- `https://YOUR-PROJECT.vercel.app/api/integrations/facebook/callback`

Meta App Dashboard also needs the Privacy Policy URL: `https://YOUR-PROJECT.vercel.app/privacy`

## Cron

`vercel.json` schedules `GET /api/cron/tick` once per day so the project deploys on the **Hobby** plan.

On **Pro**, change the schedule to every 15 minutes:

```json
"schedule": "*/15 * * * *"
```

Jobs are idempotent and time out at 25s (serverless-safe). This is not a persistent worker. For high volume, run the same queue against the same database from an external worker.

## Local vs Vercel builds

- Local: `npm run build` → `prisma generate && next build` (no live database required)
- Vercel: `npm run vercel-build` → generate + migrate + next build
