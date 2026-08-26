export type Capability =
  | "facebook.pages.read"
  | "facebook.pages.comment"
  | "facebook.pages.comments.read"
  | "facebook.groups.read"
  | "facebook.groups.comment"
  | "facebook.inbox"
  | "play.apps.search"
  | "play.tracks.read"
  | "play.testers.googleGroups"
  | "play.testers.emailList"
  | "play.install.perTester"
  | "groups.members.manage"
  | "gmail.send";

export type CapabilityMap = Partial<Record<Capability, boolean>>;

export const FACEBOOK_GROUP_LIMITATION =
  "Automatic Facebook Group discovery, commenting, and inbox monitoring are unavailable. Meta deprecated the Groups API in Graph API v19 and removed it for all versions in April 2024. TestLoop will not scrape groups. Import a post manually, generate a reply, then paste the comment into Facebook yourself.";

export const PLAY_EMAIL_LIST_LIMITATION =
  "The Google Play Developer API testers resource supports Google Groups email addresses only. Individual email-list testers in Play Console are not available through the official API.";

export const PLAY_INSTALL_LIMITATION =
  "Google Play APIs do not confirm that a specific Gmail downloaded the app. Per-tester install status stays unknown unless the tester's app sends TestLoop telemetry.";

export const GROUPS_API_LIMITATION =
  "Automatic Google Group membership requires Google Workspace Admin SDK or Cloud Identity Groups API access. Consumer Google Groups cannot be managed through those APIs. Add the tester in groups.google.com, then confirm here.";

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
