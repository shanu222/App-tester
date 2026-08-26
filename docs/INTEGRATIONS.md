# Integrations

TesterBridge uses official OAuth / service accounts only. If an API cannot do something, the UI says so and offers a manual fallback. Success is never faked in production.

## Facebook / Meta

**OAuth:** Meta app → Facebook Login → redirect `{APP_URL}/api/integrations/facebook/callback`

**Scopes requested:** `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_engagement`

**What works**

- List Pages the user manages (`GET /me/accounts`)
- Read Page feed (`GET /{page-id}/feed`)
- Comment on Page posts after approval (`POST /{page-post-id}/comments`)
- Read Page post comments for reply monitoring

**What does not work (do not scrape)**

Meta deprecated the **Groups API** in Graph API v19 and removed it for all versions on 22 April 2024 (`publish_to_groups`, `groups_access_member_info`). TesterBridge will not:

- search Facebook Groups
- post to Groups via API
- read Group inboxes

**Fallback:** add a manual source named e.g. “Android App Testing”, paste post content you are allowed to see, generate a reply, copy it into Facebook yourself, paste replies back.

## Google login + Gmail

Create a Google Cloud OAuth client (Web application).

Authorized redirect URIs:

- `{APP_URL}/api/auth/callback/google` (sign-in)
- `{APP_URL}/api/integrations/gmail/callback` (Gmail send)

Enable **Gmail API**. Scope: `gmail.send`, `userinfo.email`.

Emails (invitation, feedback request) send **only** if Settings → Allow automated Gmail sending is on.

## Google Play Developer API

1. Google Cloud project → enable **Google Play Android Developer API** and **Google Play Developer Reporting API**.
2. Create a **service account**. Download JSON.
3. In Play Console → Users and permissions, invite the service account with app access (at least view app information / releases / testing as needed).
4. In TesterBridge → Integrations, paste the JSON and optionally a package name. Status becomes **Connected only after a live API check** (`apps.search` and/or `edits.insert`).

**Implemented official operations**

- `GET https://playdeveloperreporting.googleapis.com/v1beta1/apps:search` — list accessible apps
- `edits.insert` + `edits.tracks.list` — tracks
- `edits.testers.get` / `update` — **Google Group emails only**
- Reporting vitals with `userCohort=APP_TESTERS` are aggregate, not per-Gmail

**Not implemented because the API does not support it**

- Adding individual emails to Play’s email-list tester UI (`edits.testers` JSON is `{ googleGroups: string[] }` only)

Preferred architecture: Google Group on the closed track + TesterBridge membership automation when Workspace allows it.

## Google Groups

If the user has Google Workspace:

- Enable Admin SDK
- Domain-wide delegation for `https://www.googleapis.com/auth/admin.directory.group.member`
- Upload the service account JSON + admin email
- `members.insert` then `members.hasMember`

If not:

The UI shows **Manual action required** with exact Groups UI steps. Membership is only marked `GROUP_MEMBER` after API verification or explicit user confirmation. Never faked.

## In-app tester telemetry (optional)

`POST /api/telemetry` with `{ campaignToken, anonymousId, appVersion, platform }`.

This records **tester activity detected**, not “Google confirmed this Gmail downloaded.”
