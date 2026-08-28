import type { TestingType } from "@prisma/client";
import { normalizeEmail } from "@/lib/email-extract";
import type { PlayTrackRecord } from "@/lib/integrations/types";

export type TestingAccessMethod = "google_group" | "individual" | "open" | "internal" | "unknown";
export type GoogleGroupConfigured = true | false | "unknown";
export type TesterJoinKind = "open" | "google_group" | "individual";

export type TrackAccessSnapshot = {
  method: TestingAccessMethod;
  groupConfigured: GoogleGroupConfigured;
  groupEmails: string[] | null;
  groupEmail: string | null;
  groupJoinUrl: string | null;
  publicAccessLabel: string;
  developerAccessLabel: string;
  individualEnrollmentApplicable: boolean;
  joinKind: TesterJoinKind;
};

export function googleGroupJoinUrl(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!normalized.endsWith("@googlegroups.com")) return null;
  const local = normalized.slice(0, -"@googlegroups.com".length).trim();
  if (!local) return null;
  return `https://groups.google.com/g/${encodeURIComponent(local)}`;
}

function groupEmailsFromTrack(track: PlayTrackRecord | null | undefined): string[] | null {
  if (!track) return null;
  if (Array.isArray(track.googleGroups)) {
    return track.googleGroups.map((value) => value.trim()).filter(Boolean);
  }
  return null;
}

export function groupConfiguredFromTrack(track: PlayTrackRecord | null | undefined): GoogleGroupConfigured {
  if (!track) return "unknown";
  if (typeof track.googleGroupCount === "number") {
    return track.googleGroupCount > 0;
  }
  if (Array.isArray(track.googleGroups)) {
    return track.googleGroups.length > 0;
  }
  return "unknown";
}

/**
 * Derive how testers join this Play track. Never invents a Google Group.
 * googleGroupCount/googleGroups come only from the Play testers resource.
 */
export function detectTrackAccess(
  testingType: TestingType | string,
  track?: PlayTrackRecord | null,
  stored?: {
    testingAccessMethod?: string | null;
    googleGroupConfigured?: boolean | null;
    googleGroupEmail?: string | null;
  },
): TrackAccessSnapshot {
  const emails = groupEmailsFromTrack(track);
  const storedEmail = stored?.googleGroupEmail?.trim() || null;
  const groupEmails = emails ?? (storedEmail ? [storedEmail] : null);
  const groupEmail = groupEmails?.[0] || storedEmail;
  const fromTrack = groupConfiguredFromTrack(track);
  const groupConfigured: GoogleGroupConfigured =
    fromTrack !== "unknown"
      ? fromTrack
      : stored?.googleGroupConfigured == null
        ? "unknown"
        : stored.googleGroupConfigured;
  const joinKind: TesterJoinKind = groupConfigured === true ? "google_group" : "individual";
  const publicAccessLabel =
    groupConfigured === true
      ? "Google Group testing available"
      : groupConfigured === false
        ? "Individual tester access"
        : "Google Group status unavailable";

  if (testingType === "OPEN") {
    return {
      method: "open",
      groupConfigured: false,
      groupEmails,
      groupEmail,
      groupJoinUrl: null,
      publicAccessLabel: "Open testing",
      developerAccessLabel: "Open testing",
      individualEnrollmentApplicable: false,
      joinKind: "open",
    };
  }

  if (testingType === "INTERNAL") {
    return {
      method: "internal",
      groupConfigured,
      groupEmails,
      groupEmail,
      groupJoinUrl: groupConfigured === true ? googleGroupJoinUrl(groupEmail) : null,
      publicAccessLabel,
      developerAccessLabel: "Internal testing",
      individualEnrollmentApplicable: groupConfigured !== true,
      joinKind,
    };
  }

  const storedMethod = stored?.testingAccessMethod;
  const method: TestingAccessMethod =
    groupConfigured === true
      ? "google_group"
      : groupConfigured === false
        ? "individual"
        : storedMethod === "google_group" || storedMethod === "individual" || storedMethod === "unknown"
          ? storedMethod
          : "unknown";

  return {
    method,
    groupConfigured,
    groupEmails,
    groupEmail,
    groupJoinUrl: groupConfigured === true ? googleGroupJoinUrl(groupEmail) : null,
    publicAccessLabel,
    developerAccessLabel:
      groupConfigured === true ? "Google Group" : groupConfigured === false ? "Individual testers" : "Unknown",
    individualEnrollmentApplicable: groupConfigured !== true,
    joinKind,
  };
}

export function campaignAccessFields(access: TrackAccessSnapshot) {
  return {
    testingAccessMethod: access.method,
    googleGroupConfigured: access.groupConfigured === "unknown" ? null : access.groupConfigured,
    googleGroupEmail: access.groupEmail,
  };
}

export const GROUP_MEMBERSHIP_UNVERIFIABLE =
  "After joining the group, open the Google Play testing link. TestLoop cannot verify Google Group membership through the available Google APIs.";

export const GROUP_JOIN_NEXT_STEP =
  "Join the Google Group using the same Google account you use on Google Play. After joining, return to TestLoop and verify your access.";
