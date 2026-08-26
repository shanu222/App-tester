# Testing

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit tests use Vitest and **do not** call Facebook or Google. They cover:

- Relevance scoring (high match vs jobs/spam)
- Email extraction / Gmail detection
- Tester status transitions
- Duplicate email+campaign keys
- Reply templates (no false “already added/tested”)
- Idempotency hashing and cron secret compare
- Capability flags (Groups API unavailable, Play testing link rules)

Integration adapters are isolated in `src/lib/integrations/*`. Production adapters throw/return `ok: false` instead of inventing success. `DEMO_MODE` mock posts are labeled and refused when `NODE_ENV=production`.

Critical workflow (manual, with real credentials):

1. Create campaign NET360 / target 12 / closed / source.
2. Import or discover a high-match post.
3. Generate reply → Approve & Post (Page API or manual copy).
4. Paste `Sure, my Gmail is tester@gmail.com` → Confirm.
5. Duplicate add of the same email+campaign must fail with `Tester already exists.`
6. Google Group add: Connected Workspace → membership; otherwise Manual action required.
7. Invitation includes the configured testing link only.
8. Record opt-in separately from added.
9. Telemetry marks testing activity, not a Play download confirmation.
10. Feedback stores under tester + campaign + app.
