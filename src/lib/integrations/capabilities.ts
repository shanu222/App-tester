export type Capability =
  | "facebook.pages.read"
  | "facebook.pages.comment"
  | "facebook.pages.comments.read"
  | "facebook.groups.read"
  | "facebook.groups.comment"
  | "facebook.inbox"
  | "play.apps.search"
  | "play.tracks.read"
  | "play.tracks.write"
  | "play.testers.emailList"
  | "play.install.perTester"
  | "gmail.send";

export type CapabilityMap = Partial<Record<Capability, boolean>>;

export const FACEBOOK_GROUP_LIMITATION =
  "Automatic Facebook Group discovery, commenting, and inbox monitoring are unavailable. Meta deprecated the Groups API in Graph API v19 and removed it for all versions in April 2024. TestLoop will not scrape groups. Import a post manually, generate a reply, then paste the comment into Facebook yourself.";

export const PLAY_EMAIL_LIST_LIMITATION =
  "The Google Play Developer API cannot add individual Gmail addresses to a closed or internal tester list. TestLoop saves the request for the developer to complete in Play Console.";

export const PLAY_INSTALL_LIMITATION =
  "Google Play APIs do not confirm that a specific Gmail downloaded the app. Per-tester install status stays unknown unless the tester's app sends TestLoop telemetry.";

export function facebookPageCapabilities(): CapabilityMap {
  return {
    "facebook.pages.read": true,
    "facebook.pages.comment": true,
    "facebook.pages.comments.read": true,
    "facebook.groups.read": false,
    "facebook.groups.comment": false,
    "facebook.inbox": false,
  };
}

export function facebookManualGroupCapabilities(): CapabilityMap {
  return {
    "facebook.pages.read": false,
    "facebook.pages.comment": false,
    "facebook.pages.comments.read": false,
    "facebook.groups.read": false,
    "facebook.groups.comment": false,
    "facebook.inbox": false,
  };
}
