import type { TestingType } from "@prisma/client";

/**
 * Verified against the Android Publisher v3 Testers resource:
 * `{ googleGroups: [string] }`. Google documents that email lists in Play
 * Console are not supported by this resource.
 *
 * There is therefore no API call that puts an individual Gmail on a closed or
 * internal track. TestLoop reports that as a Google Play limitation rather
 * than as a TestLoop failure.
 */
export const PLAY_TESTER_API_LIMITATION =
  "Google Play controls eligibility for closed and internal testing tracks. TestLoop can manage your campaign and tester records, but individual email-list membership must be handled through the supported Google Play configuration. The Play Developer API does not add individual Gmail addresses to those lists.";

export const PLAY_CLOSED_TESTING_TESTER_NOTE =
  "Your email has been registered with TestLoop. Because this testing track requires controlled tester membership, the developer may need to add this email to the Play Console tester list.";

export const PLAY_INTERNAL_TESTING_TESTER_NOTE =
  "Your email has been registered with TestLoop. Because internal testing requires controlled tester membership, the developer may need to add this email in Play Console. TestLoop has not added you to Google Play.";

export const PLAY_OPEN_TRACK_NOTE =
  "Your app already has an open testing track. Testers can join through Google Play using the official opt-in link — TestLoop does not need to add individual Gmail addresses.";

export const PLAY_OPEN_TESTER_READY =
  "Your TestLoop registration is complete. Use your Google account on Google Play to join the test. TestLoop has not added you to Google Play.";

/**
 * How a tester gets access for a given track.
 *
 * - `AUTOMATIC`: open testing. No Play API write is required or possible, and
 *   the opt-in URL alone is sufficient, so TestLoop completes this end to end.
 * - `MANUAL_EMAIL_LIST`: internal/closed testing. Eligibility is configured in
 *   Play Console because the API exposes no email-list write.
 */
export type TesterAccessMode = "AUTOMATIC" | "MANUAL_EMAIL_LIST";

export function testerAccessMode(testingType: TestingType): TesterAccessMode {
  return testingType === "OPEN" ? "AUTOMATIC" : "MANUAL_EMAIL_LIST";
}

/** Play Console has no package-addressable deep link, so give the exact path. */
export const PLAY_CONSOLE_URL = "https://play.google.com/console";

export function playConsoleTesterSteps(testingType: TestingType): string[] {
  const track = testingType === "INTERNAL" ? "Internal testing" : "Closed testing";
  return [
    "Open Play Console and select this app.",
    `Go to Test and release → Testing → ${track}.`,
    "Select the track, then open the Testers tab.",
    "Configure tester eligibility using the supported Google Play options for this track.",
    "Save the changes in Play Console, then mark the testers as added in TestLoop.",
  ];
}

/**
 * The official Play opt-in URL for a package. This is Google's own testing
 * endpoint, never a TestLoop-hosted download.
 */
export function playOptInUrl(packageName: string) {
  const trimmed = packageName.trim();
  if (!trimmed) return null;
  return `https://play.google.com/apps/testing/${trimmed}`;
}

/**
 * Resolve the real Google Play testing link for a campaign.
 *
 * Open and closed tracks share the derivable `apps/testing/{package}` opt-in
 * page, so TestLoop can build it. Internal testing does not: its link is
 * `apps/internaltest/{opaque id}`, which the Play Developer API never returns.
 * Rather than invent one, TestLoop asks the developer to paste the link Play
 * Console shows them, and reports it as missing until they do.
 */
export function campaignTestingUrl(input: {
  testingType: TestingType;
  packageName: string;
  configuredUrl?: string | null;
}): { url: string | null; reason: string | null } {
  const configured = input.configuredUrl?.trim();
  if (configured) return { url: configured, reason: null };
  if (input.testingType === "INTERNAL") {
    return {
      url: null,
      reason:
        "Internal testing opt-in links are issued by Play Console as apps/internaltest/… and are not exposed by the Play Developer API. Copy the link from Play Console → Internal testing → Testers and paste it into this campaign.",
    };
  }
  const url = playOptInUrl(input.packageName);
  return url
    ? { url, reason: null }
    : { url: null, reason: "This app has no package name, so no opt-in URL can be built." };
}
