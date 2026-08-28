# Environment variables

Copy `.env.example` to `.env.local` (local) or Vercel project settings (hosted). Never commit real values.

There is no login system. `APP_URL` should be `https://app-tester-three.vercel.app` in production.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (pooled on Vercel) |
| `DIRECT_URL` | yes on Vercel | Direct / unpooled URL for Prisma migrations |
| `APP_URL` | yes | Public origin, e.g. `https://app-tester-three.vercel.app` |
| `ENCRYPTION_KEY` | yes in prod | AES-256-GCM key (64 hex chars) for OAuth tokens and service-account JSON |
| `CRON_SECRET` | yes in prod | Bearer secret for `/api/cron/tick` and `/api/cron/daily-testing-summary`. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set in Vercel → Project → Settings → Environment Variables. Never use a predictable value. Never expose via `NEXT_PUBLIC_*`. |
| `SMTP_HOST` | for email | SMTP server host. Already set on Vercel. Do not rename or expose. |
| `SMTP_PORT` | for email | SMTP port (typically `587` or `465`) |
| `SMTP_SECURE` | for email | `true` only when using TLS on connect (usually port 465) |
| `SMTP_USER` | for email | SMTP username. Server-side only. |
| `SMTP_PASSWORD` | for email | SMTP password. Server-side only. Never log or commit. |
| `SMTP_FROM_EMAIL` | for email | From address (TestLoop sending mailbox) |
| `SMTP_FROM_NAME` | for email | From display name, e.g. `TestLoop` |
| `DEMO_MODE` | yes | `true` only in development. Production must be `false` |
| `DEFAULT_USER_EMAIL` | no | Email of the single workspace user (default `owner@local`) |
| `GOOGLE_CLIENT_ID` | for Gmail send + Play OAuth | Google Cloud OAuth client. Not a login provider. |
| `GOOGLE_CLIENT_SECRET` | for Gmail send | OAuth client secret |
| `FACEBOOK_CLIENT_ID` | for Facebook | Meta app ID |
| `FACEBOOK_CLIENT_SECRET` | for Facebook | Meta app secret |
| `FACEBOOK_REDIRECT_URI` | for Facebook | `{APP_URL}/api/integrations/facebook/callback` |
| `FACEBOOK_GRAPH_VERSION` | no | default `v21.0` |
| `GOOGLE_CLOUD_PROJECT` | no | Informational |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | no | Prefer the per-developer connection on /play instead |
| `RESEND_API_KEY` | no | Optional system mail |
| `EMAIL_FROM` | no | From header for system mail |

Gmail sending uses Google OAuth with `gmail.send`. Redirect is `{APP_URL}/api/integrations/gmail/callback`. There is no Google login.

Do not put Facebook/Google/Gmail/Play **passwords**, `SMTP_PASSWORD`, or `CRON_SECRET` in env files that are committed, in `NEXT_PUBLIC_*` variables, API responses, or frontend code.

## CRON_SECRET

Vercel → Project → Settings → Environment Variables

- Name: `CRON_SECRET`
- Value: a cryptographically secure random secret, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Vercel Cron sends `Authorization: Bearer $CRON_SECRET` to `/api/cron/tick` and `/api/cron/daily-testing-summary` (`0 11 * * *` ≈ 4:00 PM Asia/Karachi).
