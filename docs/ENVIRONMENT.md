# Environment variables

Copy `.env.example` to `.env.local` (local) or Vercel project settings (hosted). Never commit real values.

There is no login system. `APP_URL` should be `https://app-tester-three.vercel.app` in production.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (pooled on Vercel) |
| `DIRECT_URL` | yes on Vercel | Direct / unpooled URL for Prisma migrations |
| `APP_URL` | yes | Public origin, e.g. `https://app-tester-three.vercel.app` |
| `ENCRYPTION_KEY` | yes in prod | AES-256-GCM key (64 hex chars) for OAuth tokens and service-account JSON |
| `CRON_SECRET` | yes in prod | Bearer secret for `/api/cron/tick` |
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

Do not put Facebook/Google/Gmail/Play **passwords** in env.
