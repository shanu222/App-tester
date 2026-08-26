# Vercel + Neon setup

The GitHub repo is already wired. There is **no login** and **no Google login**. Opening the site uses the app immediately.

Live URL: `https://app-tester-three.vercel.app`

## 1. Keep Neon database vars (already created)

Do **not** delete these if Vercel/Neon already added them:

- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `DIRECT_URL`

Each must be enabled for **Production**, **Preview**, and **Build**.

You can **delete** these if they exist (login is gone):

- `AUTH_SECRET`
- `AUTH_URL`
- `GOOGLE_REDIRECT_URI`

## 2. Required env vars — copy into Vercel

Vercel → **Settings → Environment Variables** → Production + Preview + Development.

```
APP_URL=https://app-tester-three.vercel.app
DEMO_MODE=false
ENCRYPTION_KEY=<paste the 64-char hex from the chat>
CRON_SECRET=<paste the hex from the chat>
```

If you already set `ENCRYPTION_KEY` earlier, keep that old value. Changing it breaks stored OAuth tokens.

## 3. Redeploy

1. Vercel → **Deployments** → wait for the latest `main` push, or **Redeploy**
2. Open `https://app-tester-three.vercel.app/api/health` — should show `"ok": true`
3. Open `https://app-tester-three.vercel.app/` — you should land on the dashboard with no sign-in

## 4. Optional: Gmail send (not login)

1. [Google Cloud Console](https://console.cloud.google.com/) → project
2. Enable **Gmail API**
3. Credentials → OAuth client ID → Web application
4. Redirect: `https://app-tester-three.vercel.app/api/integrations/gmail/callback`
5. Origin: `https://app-tester-three.vercel.app`
6. Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 5. Optional: Facebook Pages

1. [Meta for Developers](https://developers.facebook.com/) → Create app → Facebook Login
2. Redirect: `https://app-tester-three.vercel.app/api/integrations/facebook/callback`
3. Privacy: `https://app-tester-three.vercel.app/privacy`
4. Vercel:
   - `FACEBOOK_CLIENT_ID`
   - `FACEBOOK_CLIENT_SECRET`
   - `FACEBOOK_REDIRECT_URI=https://app-tester-three.vercel.app/api/integrations/facebook/callback`

## 6. Optional: Google Play (inside the app)

1. Enable Play Android Publisher API + Play Developer Reporting API
2. Create a service account JSON
3. Invite it in Play Console
4. TesterBridge → **Integrations** → paste JSON → Test & connect

OAuth can stay disconnected. Manual import, paste-reply, and manual testers still work.
