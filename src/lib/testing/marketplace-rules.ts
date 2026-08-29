export const MARKETPLACE_DURATION_DAYS = 14;
export const MARKETPLACE_INVITE_TYPE = "INVITE";
export const MARKETPLACE_REMINDER_TYPE = "REMINDER";
export const MARKETPLACE_INVITE_DAY_KEY = "initial";
export const MARKETPLACE_EMAIL_ACTION_KIND = "ACCEPT_DOWNLOAD";

const DAY_MS = 86_400_000;

export function marketplaceEndsAt(startedAt: Date, durationDays = MARKETPLACE_DURATION_DAYS) {
  return new Date(startedAt.getTime() + durationDays * DAY_MS);
}

export function daysRemaining(endsAt: Date, now = new Date()) {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS));
}

export function campaignIsLive(input: {
  status: string;
  published: boolean;
  startedAt?: Date | null;
  endsAt?: Date | null;
  durationDays?: number | null;
  now?: Date;
}) {
  if (!input.published || input.status !== "ACTIVE") return false;
  const now = input.now ?? new Date();
  const startedAt = input.startedAt ?? null;
  const durationDays = input.durationDays || MARKETPLACE_DURATION_DAYS;
  const endsAt = input.endsAt ?? (startedAt ? marketplaceEndsAt(startedAt, durationDays) : null);
  if (endsAt && endsAt.getTime() <= now.getTime()) return false;
  return true;
}

export function shouldReuseActiveCampaign<T extends { id: string }>(existing: T | null) {
  return existing;
}

export function marketplaceParticipationActed(participation: {
  acceptedAt?: Date | string | null;
  downloadLinkClickedAt?: Date | string | null;
  consentAt?: Date | string | null;
  status?: string | null;
} | null) {
  if (!participation) return false;
  if (participation.acceptedAt || participation.downloadLinkClickedAt || participation.consentAt) return true;
  const status = participation.status || "";
  return status === "DECLINED" || status === "COMPLETED";
}

export function isPaidOperationTesterEmail(email: string, paidEmails: Iterable<string>) {
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  for (const item of paidEmails) {
    if (item.trim().toLowerCase() === needle) return true;
  }
  return false;
}

export function marketplaceInviteAllowed(input: {
  campaignLive: boolean;
  isOwner: boolean;
  paidOperationTester: boolean;
  optedOut: boolean;
  alreadyInvited: boolean;
  participation: Parameters<typeof marketplaceParticipationActed>[0];
}) {
  if (!input.campaignLive || input.isOwner) return false;
  if (input.paidOperationTester || input.optedOut || input.alreadyInvited) return false;
  return !marketplaceParticipationActed(input.participation);
}

export function marketplaceReminderAllowed(input: {
  campaignLive: boolean;
  isOwner: boolean;
  paidOperationTester: boolean;
  optedOut: boolean;
  alreadyRemindedToday: boolean;
  invitedToday: boolean;
  participation: Parameters<typeof marketplaceParticipationActed>[0];
}) {
  if (!input.campaignLive || input.isOwner) return false;
  if (input.paidOperationTester || input.optedOut) return false;
  if (input.alreadyRemindedToday || input.invitedToday) return false;
  return !marketplaceParticipationActed(input.participation);
}

export function isSafePlayRedirect(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return parsed.hostname === "play.google.com" || parsed.hostname.endsWith(".google.com");
  } catch {
    return false;
  }
}

export function marketplaceStatusLabel(input: {
  campaignStatus: string;
  published: boolean;
  acceptedAt?: Date | string | null;
  downloadLinkClickedAt?: Date | string | null;
  participationStatus?: string | null;
}) {
  if (input.campaignStatus === "EXPIRED") return "EXPIRED";
  if (input.participationStatus === "COMPLETED") return "COMPLETED";
  if (input.downloadLinkClickedAt) return "DOWNLOAD LINK OPENED";
  if (input.acceptedAt) return "ACCEPTED";
  if (input.participationStatus === "REQUESTED" || input.participationStatus === "ACCEPTED") return "INVITED";
  if (input.published && input.campaignStatus === "ACTIVE") return "ACTIVE";
  return input.campaignStatus;
}
