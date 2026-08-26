# Vercel + Neon setup (do these in the dashboards)

The GitHub repo is already wired. After this push, complete these external steps once.

## 1. Neon database (already started)

You attached Neon. Confirm it is connected to the `app-tester` Vercel project.

1. Vercel → your project → **Storage**
2. Neon should be listed and **Connected**
3. Open **Settings → Environment Variables**
4. Confirm these exist (Neon usually creates them automatically):
   - `DATABASE_URL` or `POSTGRES_URL` or `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING` or `DIRECT_URL` (direct / unpooled)
5. Each URL must be enabled for **Production**, **Preview**, and **Build**
   - If Build is off, migrations fail even though the app would work at runtime

No need to invent extra names. TesterBridge maps Neon’s names automatically.

## 2. Required Vercel environment variables

Vercel → **Settings → Environment Variables**. Set all of these for Production + Preview:

| Name | How to create | Example |
|---|---|---|
| `DEMO_MODE` | type `false` | `false` |
| `APP_URL` | your Vercel domain | `https://app-tester.vercel.app` |
| `AUTH_URL` | same as APP_URL | `https://app-tester.vercel.app` |
| `AUTH_SECRET` | random 32+ chars | generate below |
| `ENCRYPTION_KEY` | 64 hex chars | generate below |
| `CRON_SECRET` | random hex | generate below |
| `EMAIL_FROM` | optional | `TesterBridge <noreply@yourdomain>` |

Generate secrets in a terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the **base64** value for `AUTH_SECRET`. Use a **hex** value for `ENCRYPTION_KEY` and another hex value for `CRON_SECRET`.

Do **not** set Facebook or Google passwords.

## 3. Redeploy

After env vars are saved:

1. Vercel → **Deployments**
2. **Redeploy** the latest `main` commit (or wait for the auto-deploy from this push)

The build now strips the bad character from the SQL migration and retries the failed Neon migration automatically.

When it works, open:

`https://YOUR-APP.vercel.app/api/health`

You should see `"ok": true`.

## 4. Google login / Gmail (optional, for real sending)

1. [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project
2. Enable **Gmail API**
3. APIs & Services → **Credentials** → Create **OAuth client ID** → Web application
4. Authorized redirect URIs:
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/integrations/gmail/callback`
5. Authorized JavaScript origins: `https://YOUR-APP.vercel.app`
6. Put into Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://YOUR-APP.vercel.app/api/auth/callback/google`
7. OAuth consent screen: add your Gmail as a test user while the app is in Testing

## 5. Facebook / Meta (optional, for Pages you manage)

Facebook Groups cannot be automated (Meta removed that API). Pages still can.

1. [Meta for Developers](https://developers.facebook.com/) → Create app
2. Add **Facebook Login**
3. Valid OAuth Redirect URI:
   - `https://YOUR-APP.vercel.app/api/integrations/facebook/callback`
4. Privacy Policy URL: `https://YOUR-APP.vercel.app/privacy`
5. Put into Vercel:
   - `FACEBOOK_CLIENT_ID`
   - `FACEBOOK_CLIENT_SECRET`
   - `FACEBOOK_REDIRECT_URI=https://YOUR-APP.vercel.app/api/integrations/facebook/callback`
6. Permissions to request later: `pages_show_list`, `pages_read_engagement`, `pages_manage_engagement`

## 6. Google Play (optional, inside the app after login)

1. Google Cloud → enable **Google Play Android Developer API** and **Play Developer Reporting API**
2. Create a **service account** → download JSON
3. [Play Console](https://play.google.com/console) → Users and permissions → invite that service account
4. In TesterBridge → **Integrations** → paste the JSON → Test & connect  
   Do not put the JSON in Vercel env unless you want a platform-wide default.

## 7. Google Workspace Groups (optional)

Only if you have Workspace and want automatic tester group adds.

1. Enable **Admin SDK**
2. Domain-wide delegation for `https://www.googleapis.com/auth/admin.directory.group.member`
3. In TesterBridge Integrations, paste the Workspace service account JSON and admin email

Without Workspace: add testers in [Google Groups](https://groups.google.com) by hand, then click **Confirm membership** in TesterBridge.

## 8. First login after a green deploy

1. Open `https://YOUR-APP.vercel.app/register`
2. Create an account
3. Follow **Onboarding**
4. Add app + campaign (package name like `com.example.net360`)
5. Use **Discovery → Import post** for Facebook Groups (API posting to groups is not available)

OAuth apps can stay disconnected. The rest of the product still works with manual import, paste-reply, and manual tester add.
