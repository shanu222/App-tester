# API

All private routes require an Auth.js session cookie. Data is always filtered by the signed-in `userId`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/auth/*` | Auth.js |
| POST | `/api/register` | Sign up |
| POST | `/api/forgot-password` | Reset token |
| POST | `/api/reset-password` | Set password |
| GET | `/api/verify-email` | Confirm email |
| GET/POST/PATCH | `/api/campaigns` | Campaigns |
| GET | `/api/campaigns/:id` | Campaign + stats |
| GET/POST | `/api/apps` | Apps |
| POST | `/api/google/play/apps` | Sync apps via Reporting API |
| POST | `/api/google/play/tracks` | List tracks |
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
| POST | `/api/google/connect` | Play service account + verify |
| GET/POST | `/api/google/groups` | Store group |
| POST | `/api/google/groups/members` | Add or confirm member |
| POST | `/api/jobs/discovery` | Enqueue / run jobs |
| GET/POST | `/api/feedback` | Feedback |
| POST | `/api/telemetry` | In-app tester ping (campaign token) |
| GET/POST | `/api/messages` | Paste reply / list |
| GET | `/api/activity` | Audit log |
| GET | `/api/analytics` | Funnel |
| GET/PATCH | `/api/settings` | Profile, limits, notifications |
| GET | `/api/cron/tick` | Scheduled worker |
| POST | `/api/export` | Data export |
| DELETE | `/api/account` | Delete account |

Unauthorized requests return `401`. Validation errors return `400`. Rate limits return `429` with `Daily outreach limit reached.` when applicable.
