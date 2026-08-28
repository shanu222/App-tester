import type { ParticipationStatus, PlayEnrollmentStatus } from "@prisma/client";
import type { TesterJoinKind } from "@/lib/integrations/play-access";
import type { BadgeTone } from "@/components/ui/badge";

export type EnrollmentKey =
  | "pending_developer"
  | "developer_confirmed"
  | "play_verified"
  | "ready"
  | "completed"
  | "rejected"
  | "expired"
  | "joining_group"
  | "failed";

export function enrollmentStatus(input: {
  status: ParticipationStatus | string;
  playEnrollmentStatus?: PlayEnrollmentStatus | string | null;
  joinKind?: TesterJoinKind | null;
  confirmedAt?: Date | string | null;
  campaignStatus?: string | null;
}): {
  key: EnrollmentKey;
  ownerLabel: string;
  testerLabel: string;
  tone: BadgeTone;
} {
  const campaignClosed =
    input.campaignStatus === "ARCHIVED" || input.campaignStatus === "COMPLETED";
  if (input.status === "DECLINED") {
    return { key: "rejected", ownerLabel: "Rejected", testerLabel: "Rejected", tone: "bad" };
  }
  if (input.status === "COMPLETED") {
    return { key: "completed", ownerLabel: "Completed", testerLabel: "Completed", tone: "good" };
  }
  if (input.status === "FAILED") {
    return { key: "failed", ownerLabel: "Could not complete", testerLabel: "Could not complete", tone: "bad" };
  }
  if (input.playEnrollmentStatus === "VERIFIED") {
    return {
      key: "play_verified",
      ownerLabel: "Verified on Google Play",
      testerLabel: "Google Play Verified",
      tone: "good",
    };
  }
  if (
    input.playEnrollmentStatus === "OPEN_OPT_IN" ||
    input.status === "OPTED_IN" ||
    input.status === "ACTIVITY_DETECTED" ||
    input.status === "FEEDBACK_RECEIVED"
  ) {
    return { key: "ready", ownerLabel: "Ready to Test", testerLabel: "Ready to Test", tone: "good" };
  }
  if (input.status === "ADDED" || input.status === "INVITATION_READY" || input.confirmedAt) {
    return {
      key: "developer_confirmed",
      ownerLabel: "Developer Confirmed",
      testerLabel: "Developer Confirmed",
      tone: "good",
    };
  }
  if (campaignClosed) {
    return { key: "expired", ownerLabel: "Expired", testerLabel: "Expired", tone: "neutral" };
  }
  if (input.joinKind === "google_group" && (input.status === "ACCEPTED" || input.playEnrollmentStatus === "PENDING")) {
    return {
      key: "joining_group",
      ownerLabel: "Waiting for Developer",
      testerLabel: "Pending Developer",
      tone: "warn",
    };
  }
  if (
    input.status === "MANUAL_REQUIRED" ||
    input.status === "GMAIL_CONFIRMED" ||
    input.status === "ACCESS_PROCESSING"
  ) {
    return {
      key: "pending_developer",
      ownerLabel: "Waiting for Developer",
      testerLabel: "Pending Developer",
      tone: "warn",
    };
  }
  if (input.status === "ACCEPTED") {
    return {
      key: "pending_developer",
      ownerLabel: "Waiting for Developer",
      testerLabel: "Pending Developer",
      tone: "warn",
    };
  }
  return {
    key: "pending_developer",
    ownerLabel: String(input.status).replaceAll("_", " "),
    testerLabel: String(input.status).replaceAll("_", " "),
    tone: "neutral",
  };
}
