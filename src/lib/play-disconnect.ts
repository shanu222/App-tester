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
