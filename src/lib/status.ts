import type { TesterStatus } from "@prisma/client";

const ORDER: TesterStatus[] = [
  "DISCOVERED",
  "CONTACTED",
  "REPLIED",
  "EMAIL_RECEIVED",
  "EMAIL_CONFIRMED",
  "ADDING",
  "ADDED",
  "INVITATION_SENT",
  "OPT_IN_PENDING",
  "OPTED_IN",
  "INSTALL_STATUS_UNKNOWN",
  "TESTING",
  "FEEDBACK_REQUESTED",
  "FEEDBACK_RECEIVED",
  "COMPLETED",
];

const TERMINAL: TesterStatus[] = ["DECLINED", "BLOCKED", "ERROR", "COMPLETED"];

const ALLOWED: Record<TesterStatus, TesterStatus[]> = {
  DISCOVERED: ["CONTACTED", "REPLIED", "EMAIL_RECEIVED", "EMAIL_CONFIRMED", "DECLINED", "BLOCKED", "ERROR"],
  CONTACTED: ["REPLIED", "EMAIL_RECEIVED", "EMAIL_CONFIRMED", "DECLINED", "BLOCKED", "ERROR"],
  REPLIED: ["EMAIL_RECEIVED", "EMAIL_CONFIRMED", "DECLINED", "BLOCKED", "ERROR"],
  EMAIL_RECEIVED: ["EMAIL_CONFIRMED", "DECLINED", "BLOCKED", "ERROR"],
  EMAIL_CONFIRMED: ["ADDING", "ADDED", "DECLINED", "BLOCKED", "ERROR"],
  ADDING: ["ADDED", "ERROR", "DECLINED"],
  ADDED: ["INVITATION_SENT", "OPT_IN_PENDING", "ERROR"],
  INVITATION_SENT: ["OPT_IN_PENDING", "ERROR"],
  // Retained so tester history recorded before Google Groups was removed still
  // renders and can move forward. Nothing transitions into it any more.
  GROUP_MEMBER: ["INVITATION_SENT", "OPT_IN_PENDING", "OPTED_IN", "ERROR"],
  OPT_IN_PENDING: ["OPTED_IN", "ERROR", "DECLINED"],
  OPTED_IN: ["INSTALL_STATUS_UNKNOWN", "TESTING", "FEEDBACK_REQUESTED", "ERROR"],
  INSTALL_STATUS_UNKNOWN: ["TESTING", "FEEDBACK_REQUESTED", "COMPLETED"],
  TESTING: ["FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"],
  FEEDBACK_REQUESTED: ["FEEDBACK_RECEIVED", "COMPLETED"],
  FEEDBACK_RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  DECLINED: ["BLOCKED"],
  BLOCKED: [],
  ERROR: [
    "DISCOVERED",
    "CONTACTED",
    "EMAIL_CONFIRMED",
    "ADDING",
    "ADDED",
    "OPT_IN_PENDING",
  ],
};

export function canTransition(from: TesterStatus, to: TesterStatus) {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: TesterStatus, to: TesterStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid tester status transition: ${from} → ${to}`);
  }
}

export function statusRank(status: TesterStatus) {
  const index = ORDER.indexOf(status);
  return index === -1 ? -1 : index;
}

export function isTerminalStatus(status: TesterStatus) {
  return TERMINAL.includes(status);
}

export const TESTER_STATUS_LABELS: Record<TesterStatus, string> = {
  DISCOVERED: "Discovered",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  EMAIL_RECEIVED: "Email received",
  EMAIL_CONFIRMED: "Email confirmed",
  ADDING: "Eligibility pending",
  ADDED: "Added to access",
  INVITATION_SENT: "Invitation sent",
  GROUP_MEMBER: "Group member (legacy)",
  OPT_IN_PENDING: "Opt-in pending",
  OPTED_IN: "Opted in",
  INSTALL_STATUS_UNKNOWN: "Installation status unknown",
  TESTING: "Testing activity detected",
  FEEDBACK_REQUESTED: "Feedback requested",
  FEEDBACK_RECEIVED: "Feedback received",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  BLOCKED: "Blocked",
  ERROR: "Error",
};

export const TIMELINE_STEPS: TesterStatus[] = [
  "DISCOVERED",
  "CONTACTED",
  "REPLIED",
  "EMAIL_CONFIRMED",
  "ADDED",
  "INVITATION_SENT",
  "OPTED_IN",
  "TESTING",
  "FEEDBACK_RECEIVED",
];
