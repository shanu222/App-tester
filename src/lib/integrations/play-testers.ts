import type { TestingType } from "@prisma/client";
import { normalizeEmail } from "@/lib/email-extract";

/**
 * Verified against the Android Publisher v3 Testers resource:
 * `{ googleGroups: [string] }`. Google documents that email lists in Play
 * Console are not supported by this resource.
 *
 * TestLoop therefore never claims it added an individual Gmail to a closed or
 * internal tester list. Closed/internal joins become a developer-confirmation
 * request unless Play already configured a Google Group on the track. TestLoop
 * never writes googleGroups or email lists through the testers API.
 */
export const PLAY_TESTER_API_LIMITATION =
  "Google Play API does not support adding individual Gmail addresses to a closed-test email list. The tester request has been saved and requires developer action in Play Console.";

export const PLAY_INTERNAL_TESTER_LIMIT_NOTE = "Internal Testing tester limit reached.";

export const PLAY_CLOSED_TESTING_TESTER_NOTE = PLAY_TESTER_API_LIMITATION;

export const PLAY_INTERNAL_TESTING_TESTER_NOTE =
  "Google Play API does not support adding individual Gmail addresses to an internal-test email list. The tester request has been saved and requires developer action in Play Console.";

export const PLAY_VERIFY_UNAVAILABLE =
  "Google Play API does not expose individual closed-test email-list membership. TestLoop cannot independently verify this tester through the API.";

export const PLAY_OPEN_TRACK_NOTE =
  "Anyone can join this Google Play open test. TestLoop recorded your Gmail for TestLoop records and did not add it to a Play tester list.";

export const PLAY_OPEN_TESTER_READY = PLAY_OPEN_TRACK_NOTE;

export const PLAY_ENROLLMENT_FAILED =
  "TestLoop could not complete this Google Play tester request.";

export type TesterAccessMode = "OPEN_OPT_IN" | "PLAY_TRACK_TESTERS";

export function testerAccessMode(testingType: TestingType): TesterAccessMode {
  return testingType === "OPEN" ? "OPEN_OPT_IN" : "PLAY_TRACK_TESTERS";
}

export function isGoogleGroupAddress(email: string) {
  return normalizeEmail(email).endsWith("@googlegroups.com");
}

/**
 * Build the googleGroups payload for an update. Existing groups are kept.
 * Returns alreadyPresent when the candidate is already on the list.
 */
export function mergeGoogleGroups(existing: string[], candidate: string) {
  const normalized = normalizeEmail(candidate);
  const groups = existing.map((group) => group.trim()).filter(Boolean);
  const alreadyPresent = groups.some((group) => normalizeEmail(group) === normalized);
  if (alreadyPresent) return { groups, alreadyPresent: true };
  return { groups: [...groups, normalized], alreadyPresent: false };
}

export const PLAY_CONSOLE_URL = "https://play.google.com/console";

export function playConsoleTesterSteps(testingType: TestingType): string[] {
  const track = testingType === "INTERNAL" ? "Internal testing" : "Closed testing";
  return [
    "Open Play Console and select this app.",
    `Go to Test and release → Testing → ${track}.`,
    "Select the track, then open the Testers tab.",
    "Configure tester eligibility using the supported Google Play options for this track.",
  ];
}

export function playOptInUrl(packageName: string) {
  const trimmed = packageName.trim();
  if (!trimmed) return null;
  return `https://play.google.com/apps/testing/${trimmed}`;
}

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
        "Internal testing opt-in links are issued by Play Console as apps/internaltest/… and are not exposed by the Play Developer API. Copy the link from Play Console → Internal testing → Testers.",
    };
  }
  const url = playOptInUrl(input.packageName);
  return url
    ? { url, reason: null }
    : { url: null, reason: "This app has no package name, so no opt-in URL can be built." };
}
