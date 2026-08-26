# Security

- No Facebook, Google, Gmail, or Play passwords are collected or stored.
- OAuth refresh tokens and service-account JSON are encrypted with AES-256-GCM (`ENCRYPTION_KEY`).
- Sessions use Auth.js JWT cookies (`httpOnly`, `sameSite=lax`, `secure` in production).
- Every data query is scoped by `userId`. User A cannot read User B’s testers, apps, tokens, or analytics.
- Prisma parameterizes SQL.
- Cron jobs require `Authorization: Bearer $CRON_SECRET`.
- Conservative outreach rate limits default to 3 comments/hour and 8/day.
- Human approval is the default for comments.
- Block list + declined testers are not re-contacted for that campaign.
- Production refuses `DEMO_MODE=true`.
- Secrets must not be committed. `.gitignore` excludes `.env*` (except `.env.example`) and `*service-account*.json`.
- Account deletion clears stored credentials and anonymizes the login email.
- HTTPS is required in production (Vercel). Security headers: `X-Frame-Options`, `nosniff`, `Referrer-Policy`.
- Raw integration errors are logged server-side; clients receive safe messages.

## Secret rotation

1. Generate a new `ENCRYPTION_KEY`.
2. Reconnect integrations (old ciphertext cannot be decrypted with a new key).
3. Rotate `AUTH_SECRET` (signs users out).
4. Rotate `CRON_SECRET` and update the Vercel cron header or query param.
