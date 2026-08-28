import type { ManagedAssignmentStatus, ManagedCampaignStatus, ManagedPaymentStatus } from "@prisma/client";
import type { BadgeTone } from "@/components/ui/badge";

export const ASSIGNMENT_STATUS_LABELS: Record<ManagedAssignmentStatus, string> = {
  AVAILABLE: "Available",
  INVITED: "Invited",
  EMAIL_SENT: "Invitation sent",
  EMAIL_OPENED: "Invitation opened",
  GROUP_JOINED: "Group joined",
  OPTED_IN: "Opted in",
  TESTING: "Testing",
  CONFIRMATION_PENDING: "Confirmation pending",
  CONFIRMED: "Tester confirmed installation",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

export function assignmentStatusTone(status: ManagedAssignmentStatus): BadgeTone {
  if (status === "DECLINED" || status === "EXPIRED") return "bad";
  if (status === "CONFIRMED" || status === "COMPLETED" || status === "TESTING" || status === "OPTED_IN") return "good";
  if (status === "CONFIRMATION_PENDING" || status === "EMAIL_SENT" || status === "INVITED") return "warn";
  return "accent";
}

export const CAMPAIGN_STATUS_LABELS: Record<ManagedCampaignStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  DRAFT: "Draft",
  READY: "Ready to start",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function campaignStatusTone(status: ManagedCampaignStatus): BadgeTone {
  if (status === "ACTIVE") return "good";
  if (status === "COMPLETED") return "accent";
  if (status === "CANCELLED" || status === "EXPIRED") return "bad";
  if (status === "AWAITING_PAYMENT") return "warn";
  return "neutral";
}

export const PAYMENT_STATUS_LABELS: Record<ManagedPaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export function paymentStatusTone(status: ManagedPaymentStatus): BadgeTone {
  if (status === "PAID") return "good";
  if (status === "FAILED" || status === "CANCELLED") return "bad";
  if (status === "REFUNDED") return "warn";
  return "warn";
}

export function invitationLabel(status: string) {
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Failed";
  return "Not sent";
}

export function optInLabel(status: string) {
  return status === "JOINED" ? "Joined" : "Pending";
}

export function confirmationLabel(status: string) {
  return status === "CONFIRMED" ? "Confirmed" : "Pending";
}

export function campaignDayProgress(startedAt: Date | null, durationDays: number, now = new Date()) {
  if (!startedAt) return { day: 0, durationDays, remaining: durationDays };
  const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 86_400_000) + 1;
  const day = Math.min(durationDays, Math.max(1, elapsed));
  return { day, durationDays, remaining: Math.max(0, durationDays - day) };
}
