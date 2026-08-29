import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PLAY_DISCONNECT_PARTIAL,
  PLAY_NOT_CONNECTED_FEATURE,
  PLAY_NOT_CONNECTED_FIRST,
  PLAY_REMOVED_NOTE,
  campaignDependsOnPlayConnection,
  fulfillmentAppId,
  isPlayConnectionActive,
  managedPaymentProtectsPlayApp,
  playConnectionStatusLabel,
  playSyncedAppHasPurchasedTesting,
  protectingAppIdsFromPayments,
  stripPlayDisconnectedNote,
  withPlayDisconnectedNote,
} from "../src/lib/play-disconnect";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

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

describe("Play disconnect purchased-app protection", () => {
  it("protects in-flight and paid TestLoop packages, not terminal payments", () => {
    expect(managedPaymentProtectsPlayApp("PAID")).toBe(true);
    expect(managedPaymentProtectsPlayApp("APPROVED")).toBe(true);
    expect(managedPaymentProtectsPlayApp("PENDING_PAYMENT")).toBe(true);
    expect(managedPaymentProtectsPlayApp("UNDER_REVIEW")).toBe(true);
    expect(managedPaymentProtectsPlayApp("REJECTED")).toBe(true);
    expect(managedPaymentProtectsPlayApp("FAILED")).toBe(false);
    expect(managedPaymentProtectsPlayApp("CANCELLED")).toBe(false);
    expect(managedPaymentProtectsPlayApp("REFUNDED")).toBe(false);
  });

  it("reads the TestLoop app id from payment fulfillment", () => {
    expect(fulfillmentAppId({ appId: "app_paid", testingType: "CLOSED" })).toBe("app_paid");
    expect(fulfillmentAppId({ testingUrl: "https://play.google.com/apps/testing/pkg" })).toBeNull();
    expect(fulfillmentAppId(null)).toBeNull();
  });

  it("keeps a Play-synced app when it has a managed campaign or a protecting payment", () => {
    const protecting = protectingAppIdsFromPayments([
      { status: "PAID", fulfillment: { appId: "from_fulfillment" }, campaignAppId: null },
      { status: "FAILED", fulfillment: { appId: "failed_app" }, campaignAppId: "failed_app" },
      { status: "APPROVED", campaignAppId: "from_campaign" },
    ]);
    expect(protecting.has("from_fulfillment")).toBe(true);
    expect(protecting.has("from_campaign")).toBe(true);
    expect(protecting.has("failed_app")).toBe(false);

    expect(
      playSyncedAppHasPurchasedTesting({
        appId: "unsold",
        managedCampaignCount: 0,
        protectingPaymentAppIds: protecting,
      }),
    ).toBe(false);
    expect(
      playSyncedAppHasPurchasedTesting({
        appId: "from_fulfillment",
        managedCampaignCount: 0,
        protectingPaymentAppIds: protecting,
      }),
    ).toBe(true);
    expect(
      playSyncedAppHasPurchasedTesting({
        appId: "managed_only",
        managedCampaignCount: 1,
        protectingPaymentAppIds: new Set(),
      }),
    ).toBe(true);
  });
});

describe("Play disconnect cleanup is TestLoop-side and transactional", () => {
  it("deletes unsold Play-synced apps inside one transaction and never calls Google Play", () => {
    const service = source("src/lib/services/play-connection.ts");
    const disconnect = service.slice(
      service.indexOf("export async function disconnectPlay"),
      service.indexOf("export type DiscoveredApp"),
    );
    const cleanup = service.slice(
      service.indexOf("export async function cleanupPlayDependentTestLoopData"),
      service.indexOf("async function clearLegacyPlayIntegration"),
    );

    expect(disconnect).toContain("prisma.$transaction");
    expect(disconnect).toContain("googlePlayConnection.delete");
    expect(disconnect).not.toContain("androidpublisher");
    expect(disconnect).not.toContain("listPlayTracks");
    expect(disconnect).not.toContain("searchPlayApps");

    expect(cleanup).toContain("syncedFromPlay: true");
    expect(cleanup).toContain("app.deleteMany");
    expect(cleanup).toContain("googlePlayApp.deleteMany");
    expect(cleanup).toContain("managedTestingCampaigns");
    expect(cleanup).toContain("playSyncedAppHasPurchasedTesting");
    expect(cleanup).not.toContain("campaignDependsOnPlayConnection");
    expect(cleanup).not.toContain("status: \"ARCHIVED\"");
    expect(cleanup).not.toContain("androidpublisher");
  });
});
