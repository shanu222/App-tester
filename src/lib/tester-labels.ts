import type { ParticipationStatus, PlayEnrollmentStatus, TesterStatus } from "@prisma/client";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import type { TesterJoinKind } from "@/lib/integrations/play-access";
import { enrollmentStatus } from "@/lib/enrollment-status";

export function participationStatusLabel(input: {
  status: ParticipationStatus | string;
  playEnrollmentStatus?: PlayEnrollmentStatus | string | null;
  joinKind?: TesterJoinKind | null;
  confirmedAt?: Date | string | null;
  campaignStatus?: string | null;
  role?: "owner" | "tester";
}) {
  const view = enrollmentStatus(input);
  return input.role === "owner" ? view.ownerLabel : view.testerLabel;
}

export function testerRowStatusLabel(status: TesterStatus) {
  return TESTER_STATUS_LABELS[status] || status.replaceAll("_", " ");
}
