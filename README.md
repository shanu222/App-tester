# TesterBridge

**Find Real Testers. Exchange Testing. Track Every Test.**

TesterBridge is a production web app for Android developers who need genuine Google Play testers. It finds authorized testing opportunities, prepares human-approved replies, tracks Gmail confirmation, and records the closed-testing workflow without inventing unsupported platform APIs.

## What this product does

1. Connect Facebook Pages you manage (official Graph API) or label a group source for **manual import**.
2. Score recent posts for Android / Play / closed-testing intent.
3. Generate a reciprocal-testing reply. **You approve before anything is posted.**
4. Post via the Page comments API when that is actually available; otherwise copy/paste.
5. Detect a Gmail address from a reply (API or paste).
6. Prevent duplicate testers and repeat outreach.
7. Add confirmed emails to a **Google Group** when Workspace Admin SDK access exists.
8. Send the campaign’s real testing/opt-in link after access is recorded.
9. Track contacted → replied → Gmail → added → invited → opted in → testing activity → feedback.
10. Show campaign analytics as **recorded activity**, not as Google’s eligibility decision.

## Quick start

```bash
docker compose up -d
copy .env.example .env.local
# set ENCRYPTION_KEY, CRON_SECRET, DATABASE_URL
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open http://localhost:3000 — there is no login. The app opens on the dashboard.

`DEMO_MODE=true` uses mock Facebook posts and will not call production Google/Facebook APIs. Production **must** set `DEMO_MODE=false` and real credentials.

## Deploy on Vercel

1. Push this repo to GitHub (`https://github.com/shanu222/App-tester.git`).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Create a Vercel Postgres (or Neon) database.
4. Set `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`, and `DEMO_MODE=false`. There is no login.
5. Deploy. Vercel runs `prisma migrate deploy` then `next build`.

Full steps: [DEPLOYMENT.md](DEPLOYMENT.md)

Full Vercel/Neon checklist: [VERCEL_SETUP.md](VERCEL_SETUP.md)

## Docs

- [SETUP.md](docs/SETUP.md)
- [ENVIRONMENT.md](docs/ENVIRONMENT.md)
- [INTEGRATIONS.md](docs/INTEGRATIONS.md)
- [SECURITY.md](docs/SECURITY.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [API.md](docs/API.md)
- [TESTING.md](docs/TESTING.md)

## Honest API limitations

| Capability | Official support in TesterBridge |
|---|---|
| Facebook Group feed/search/comment/inbox | **Unavailable.** Meta deprecated the Groups API in Graph v19 (removed April 2024). Import posts and paste replies. |
| Facebook Page feed + comments | Available with Page tokens (`pages_show_list`, `pages_read_engagement`, `pages_manage_engagement`). |
| Play Console individual email-list testers | **Not in the API.** `edits.testers` only accepts Google Group emails. |
| Per-Gmail Play download confirmation | **Not available.** Use opt-in recorded by you + optional in-app telemetry (“tester activity detected”). |
| Google Group member insert | Admin SDK Directory API / Cloud Identity — requires Workspace. Consumer groups need manual add. |
| List Play apps | Play Developer Reporting `apps.search`, not Android Publisher `applications.list`. |

## Scripts

- `npm run dev` — Next.js
- `npm run build` — production build
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run db:migrate` / `db:seed`
