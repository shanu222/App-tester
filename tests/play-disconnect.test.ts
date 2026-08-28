import { describe, expect, it } from "vitest";
import {
  PLAY_DISCONNECT_PARTIAL,
  PLAY_NOT_CONNECTED_FEATURE,
  PLAY_NOT_CONNECTED_FIRST,
  PLAY_REMOVED_NOTE,
  campaignDependsOnPlayConnection,
  isPlayConnectionActive,
  playConnectionStatusLabel,
  stripPlayDisconnectedNote,
  withPlayDisconnectedNote,
} from "../src/lib/play-disconnect";

describe("Play disconnect helpers", () => {
  it("treats campaigns with a Play track as connection-dependent", () => {
    expect(campaignDependsOnPlayConnection({ playTrack: "closed" })).toBe(true);
    expect(campaignDependsOnPlayConnection({ playTrack: null, app: { syncedFromPlay: true } })).toBe(
      true,
    );
    expect(campaignDependsOnPlayConnection({ playTrack: null, app: { syncedFromPlay: false } })).toBe(
      false,
    );
  });

  it("does not treat unrelated TestLoop posts as Play-dependent", () => {
    expect(campaignDependsOnPlayConnection({ playTrack: null })).toBe(false);
    expect(campaignDependsOnPlayConnection({ playTrack: "", app: { syncedFromPlay: false } })).toBe(
      false,
    );
  });

  it("marks unpublished posts without inventing extra copy on retry", () => {
    const once = withPlayDisconnectedNote("Wisdom Quest closed testing");
    expect(once.startsWith(PLAY_REMOVED_NOTE)).toBe(true);
    expect(withPlayDisconnectedNote(once)).toBe(once);
    expect(stripPlayDisconnectedNote(once)).toBe("Wisdom Quest closed testing");
    expect(stripPlayDisconnectedNote(PLAY_REMOVED_NOTE)).toBeNull();
  });

  it("uses connected / not connected rather than configured", () => {
    expect(playConnectionStatusLabel({ connected: true, status: "CONNECTED" })).toBe("Connected");
    expect(playConnectionStatusLabel({ connected: false, status: "NOT_CONNECTED" })).toBe(
      "Not connected",
    );
    expect(playConnectionStatusLabel({ connected: false, status: "ERROR" })).toBe("Connection error");
    expect(playConnectionStatusLabel({ connected: false, status: "CONNECTING" })).toBe("Connecting");
    expect(isPlayConnectionActive("CONNECTED")).toBe(true);
    expect(isPlayConnectionActive("ERROR")).toBe(false);
    expect(isPlayConnectionActive(null)).toBe(false);
  });

  it("keeps user-facing disconnect copy stable", () => {
    expect(PLAY_NOT_CONNECTED_FEATURE).toBe("Connect Google Play to use this feature.");
    expect(PLAY_NOT_CONNECTED_FIRST).toBe("Connect Google Play first.");
    expect(PLAY_DISCONNECT_PARTIAL).toContain("some TestLoop data could not be removed");
  });
});
