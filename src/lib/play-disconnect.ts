/**
 * Pure helpers for the Google Play disconnect lifecycle.
 *
 * Disconnect is a TestLoop-side operation only. These helpers never talk to
 * Google Play; they exist so UI copy, marketplace filters and cleanup stay
 * consistent without importing the Play service layer.
 */

export const PLAY_REMOVED_NOTE = "REMOVED — GOOGLE PLAY DISCONNECTED";

export const PLAY_NOT_CONNECTED_FEATURE = "Connect Google Play to use this feature.";
export const PLAY_NOT_CONNECTED_FIRST = "Connect Google Play first.";

export const PLAY_DISCONNECT_PARTIAL =
  "Google Play was disconnected, but some TestLoop data could not be removed.";

/** A TestLoop post that cannot stay active without this developer's Play connection. */
export function campaignDependsOnPlayConnection(campaign: {
  playTrack?: string | null;
  app?: { syncedFromPlay?: boolean } | null;
}): boolean {
  if (campaign.playTrack) return true;
  if (campaign.app?.syncedFromPlay) return true;
  return false;
}

export function withPlayDisconnectedNote(description: string | null | undefined): string {
  if (description?.includes(PLAY_REMOVED_NOTE)) return description;
  const existing = description?.trim();
  return existing ? `${PLAY_REMOVED_NOTE}\n\n${existing}` : PLAY_REMOVED_NOTE;
}

export function stripPlayDisconnectedNote(description: string | null | undefined): string | null {
  if (!description) return null;
  const stripped = description.replace(PLAY_REMOVED_NOTE, "").trim();
  return stripped || null;
}

export function playConnectionStatusLabel(input: { connected: boolean; status: string }): string {
  if (input.connected) return "Connected";
  if (input.status === "CONNECTING") return "Connecting";
  if (input.status === "ERROR" || input.status === "EXPIRED") return "Connection error";
  return "Not connected";
}

export function isPlayConnectionActive(status: string | null | undefined): boolean {
  return status === "CONNECTED";
}

const TERMINAL_MANAGED_PAYMENT_STATUSES = new Set(["FAILED", "CANCELLED", "REFUNDED"]);

/** Payments that still need their TestLoop app after Play is disconnected. */
export function managedPaymentProtectsPlayApp(status: string | null | undefined): boolean {
  if (!status) return false;
  return !TERMINAL_MANAGED_PAYMENT_STATUSES.has(status);
}

export function fulfillmentAppId(fulfillment: unknown): string | null {
  if (!fulfillment || typeof fulfillment !== "object") return null;
  const appId = (fulfillment as { appId?: unknown }).appId;
  return typeof appId === "string" && appId.trim() ? appId.trim() : null;
}

export function playSyncedAppHasPurchasedTesting(input: {
  managedCampaignCount: number;
  protectingPaymentAppIds: Iterable<string>;
  appId: string;
}): boolean {
  if (input.managedCampaignCount > 0) return true;
  for (const id of input.protectingPaymentAppIds) {
    if (id === input.appId) return true;
  }
  return false;
}

export function protectingAppIdsFromPayments(
  payments: Array<{ status: string; fulfillment?: unknown; campaignAppId?: string | null }>,
): Set<string> {
  const ids = new Set<string>();
  for (const payment of payments) {
    if (!managedPaymentProtectsPlayApp(payment.status)) continue;
    if (payment.campaignAppId) ids.add(payment.campaignAppId);
    const fromFulfillment = fulfillmentAppId(payment.fulfillment);
    if (fromFulfillment) ids.add(fromFulfillment);
  }
  return ids;
}
