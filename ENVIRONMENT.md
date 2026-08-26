# Environment variables

Copy `.env.example` to `.env.local` (local) or Vercel project settings (hosted). Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (pooled on Vercel) |
| `DIRECT_URL` | yes on Vercel | Direct / unpooled URL for Prisma migrations |
| `AUTH_SECRET` | yes | Auth.js signing secret |
| `AUTH_URL` / `APP_URL` | yes | Public origin, e.g. `https://your-app.vercel.app` |
| `ENCRYPTION_KEY` | yes in prod | AES-256-GCM key (64 hex chars) for OAuth tokens and service-account JSON |
| `CRON_SECRET` | yes in prod | Bearer secret for `/api/cron/tick` |
| `DEMO_MODE` | yes | `true` only in development. Production must be `false` |
| `GOOGLE_CLIENT_ID` | for Google login / Gmail | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | for Google login / Gmail | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | for Google login | `{APP_URL}/api/auth/callback/google` |
| `FACEBOOK_CLIENT_ID` | for Facebook | Meta app ID |
| `FACEBOOK_CLIENT_SECRET` | for Facebook | Meta app secret |
| `FACEBOOK_REDIRECT_URI` | for Facebook | `{APP_URL}/api/integrations/facebook/callback` |
| `FACEBOOK_GRAPH_VERSION` | no | default `v21.0` |
| `GOOGLE_CLOUD_PROJECT` | no | Informational |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | no | Prefer per-user upload in Settings instead |
| `GOOGLE_WORKSPACE_ADMIN_EMAIL` | for Groups API | Admin to impersonate |
| `GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON` | for Groups API | Or upload per user |
| `RESEND_API_KEY` | no | System mail (verify/reset). If unset, links are shown/logged in non-production |
| `EMAIL_FROM` | no | From header for system mail |

Gmail sending uses the same Google OAuth client with `gmail.send`. Redirect for Gmail connect is `{APP_URL}/api/integrations/gmail/callback`.

Do not put Facebook/Google/Gmail/Play **passwords** in env. There are no password fields for those platforms.
