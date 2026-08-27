# Integrations

TesterBridge uses official OAuth / service accounts only. If an API cannot do something, the UI says so and offers a manual fallback. Success is never faked in production.

## Facebook / Meta

**OAuth:** Meta app ‚Üí Facebook Login ‚Üí redirect `{APP_URL}/api/integrations/facebook/callback`

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

**Fallback:** add a manual source named e.g. ‚ÄúAndroid App Testing‚Äù, paste post content you are allowed to see, generate a reply, copy it into Facebook yourself, paste replies back.

## Gmail send (optional, not a login)

There is no Google login. Create a Google Cloud OAuth client only if you want TesterBridge to send Gmail.

Authorized redirect URI:

- `{APP_URL}/api/integrations/gmail/callback`

Enable **Gmail API**. Scope: `gmail.send`, `userinfo.email`.

Emails (invitation, feedback request) send **only** if Settings ‚Üí Allow automated Gmail sending is on.

## Google Play Developer API

Each developer connects their own Play Console on **/play**. Two methods are supported and both are verified against the live API before the connection is marked Connected.

**Option A ó Google OAuth**

1. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
2. Add `{APP_URL}/api/google-play/oauth/callback` as an authorised redirect URI.
3. The developer clicks **Connect with Google**. Requested scopes: `androidpublisher`, plus `openid`/`email` only so the connected account can be named.
4. The refresh token is encrypted with `ENCRYPTION_KEY` and stored server-side. It is never sent to the browser.

**Option B ó Service account**

1. Google Cloud project ? enable **Google Play Android Developer API** and, for app discovery, **Google Play Developer Reporting API**.
2. Create a service account and download its JSON key.
3. In Play Console ? Users and permissions, invite the service account email with app access.
4. Paste the key into the wizard on /play. The key is verified, then stored encrypted, and is never displayed again.

This is a per-developer authorisation and is entirely separate from TestLoop sign-in, which is handled by Firebase.

**Implemented official operations**

- `GET https://playdeveloperreporting.googleapis.com/v1beta1/apps:search` ó list accessible apps
- `edits.insert` + `edits.tracks.list` + `edits.delete` ó read real tracks and releases
- A read-only `edits.get` probe against a nonexistent package to classify connection health
- Reporting vitals with `userCohort=APP_TESTERS` are aggregate, not per-Gmail

**Not possible through the API**

- Listing the apps in a developer account. Android Publisher has no such endpoint (`applications` exposes only `dataSafety`), so discovery depends on the separate Reporting API.
- Adding an individual tester email to a track. Verified against the v3 discovery document (rev 20260826): the whole `Testers` resource is `{ googleGroups: [string] }`, and Google documents that email lists are not supported by it.

**How TestLoop handles the tester gap honestly**

- **Open testing** requires no per-tester authorisation, so TestLoop completes it end to end and returns Google's official opt-in URL.
- **Internal and closed testing** cannot be automated. TestLoop collects and de-duplicates the Gmail addresses, gives the developer the exact Play Console steps, and only marks a tester added once the developer confirms it. Nothing is ever reported as done that Google did not do.

## In-app tester telemetry (optional)

`POST /api/telemetry` with `{ campaignToken, anonymousId, appVersion, platform }`.

This records **tester activity detected**, not ‚ÄúGoogle confirmed this Gmail downloaded.‚Äù
