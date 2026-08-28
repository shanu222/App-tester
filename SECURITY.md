# Security

- No Facebook, Google, Gmail, or Play passwords are collected or stored.
- OAuth refresh tokens and service-account JSON are encrypted with AES-256-GCM (`ENCRYPTION_KEY`).
- There is no login. The app uses a single workspace user.
- Prisma parameterizes SQL.
- Cron jobs require `Authorization: Bearer $CRON_SECRET`. Missing configuration returns a server error; the secret is never sent to the browser.
- SMTP credentials stay server-side and must not appear in `NEXT_PUBLIC_*`, logs, or API responses.
- Conservative outreach rate limits default to 3 comments/hour and 8/day.
- Human approval is the default for comments.
- Block list + declined testers are not re-contacted for that campaign.
- Production refuses `DEMO_MODE=true`.
- Secrets must not be committed. `.gitignore` excludes `.env*` (except `.env.example`) and `*service-account*.json`.
- HTTPS is required in production (Vercel). Security headers: `X-Frame-Options`, `nosniff`, `Referrer-Policy`.
- Raw integration errors are logged server-side; clients receive safe messages.

## Secret rotation

1. Generate a new `ENCRYPTION_KEY`.
2. Reconnect integrations (old ciphertext cannot be decrypted with a new key).
3. Rotate `CRON_SECRET` and update the Vercel cron header or query param.
