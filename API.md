# API

There is no login. Routes use a single workspace user. Cron still requires `CRON_SECRET`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET/POST/PATCH | `/api/campaigns` | Campaigns |
| GET | `/api/campaigns/:id` | Campaign + stats |
| GET/POST | `/api/apps` | Apps |
| POST | `/api/google/play/apps` | Sync My Apps against Play |
| GET | `/api/google-play/connect/oauth` | Start Play Console OAuth |
| GET | `/api/google-play/oauth/callback` | Play OAuth callback |
| POST | `/api/google-play/connect/service-account` | Verify + store a service account key |
| POST | `/api/google-play/verify` | Re-run read-only Play checks |
| POST | `/api/google-play/disconnect` | Remove stored Play credentials |
| GET/POST | `/api/google-play/apps` | Discover / select Play apps |
| POST | `/api/google-play/tracks` | Real tracks for a package |
| POST | `/api/google-play/testers/access` | Grant tester access for a track |
| GET/POST | `/api/test/:slug` | Public testing page metadata and tester join |
| GET | `/api/testers` | Tester CRM |
| GET/PATCH | `/api/testers/:id` | Tester detail / status |
| POST | `/api/testers/manual` | Manual add |
| GET | `/api/opportunities` | Scored posts |
| POST | `/api/opportunities/:id` | Generate / skip / ignore |
| GET/POST | `/api/facebook/sources` | Pages + manual groups |
| POST | `/api/facebook/search` | Discovery or import |
| GET | `/api/facebook/posts` | Stored posts |
| POST | `/api/facebook/comments` | Approve & post |
| GET | `/api/integrations/facebook/start` | OAuth |
| GET | `/api/gmail/connect` | Gmail OAuth |
| POST | `/api/gmail/send` | Invitation / mail |
| POST | `/api/jobs/discovery` | Enqueue / run jobs |
| GET/POST | `/api/feedback` | Feedback |
| POST | `/api/telemetry` | In-app tester ping (campaign token) |
| GET/POST | `/api/messages` | Paste reply / list |
| GET | `/api/activity` | Audit log |
| GET | `/api/analytics` | Funnel |
| GET/PATCH | `/api/settings` | Profile, limits, notifications |
| GET | `/api/cron/tick` | Scheduled worker |
| POST | `/api/export` | Data export |

Validation errors return `400`. Rate limits return `429` with `Daily outreach limit reached.` when applicable.
