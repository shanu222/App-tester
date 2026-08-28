import type { ParticipationStatus, PlayEnrollmentStatus, TesterStatus } from "@prisma/client";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import type { TesterJoinKind } from "@/lib/integrations/play-access";

export function participationStatusLabel(input: {
  status: ParticipationStatus | string;
  playEnrollmentStatus?: PlayEnrollmentStatus | string | null;
  joinKind?: TesterJoinKind | null;
}) {
  if (input.status === "MANUAL_REQUIRED") return "Waiting for developer";
  if (input.status === "FAILED") return "Could not complete";
  if (input.playEnrollmentStatus === "OPEN_OPT_IN" || input.status === "OPTED_IN") return "Ready to test";
  if (input.status === "ADDED" || input.status === "INVITATION_READY") return "Ready";
  if (input.joinKind === "google_group" && (input.status === "ACCEPTED" || input.playEnrollmentStatus === "PENDING")) {
    return "Joining Google Group";
  }
  if (input.status === "ACCEPTED") return "Accepted";
  if (input.status === "GMAIL_CONFIRMED" || input.status === "ACCESS_PROCESSING") return "Waiting for developer";
  return String(input.status).replaceAll("_", " ");
}

export function testerRowStatusLabel(status: TesterStatus) {
  return TESTER_STATUS_LABELS[status] || status.replaceAll("_", " ");
}
