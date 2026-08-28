import { describe, expect, it } from "vitest";
import {
  publicJoinDetail,
  publicVersionLabel,
  sanitizePublicJoinResult,
  sanitizePublicTestingPage,
  slotsLabel,
} from "../src/lib/public-copy";
import type { PublicJoinResult, PublicTestingPage } from "../src/lib/testing-page";

describe("public tester copy", () => {
  it("hides version codes from testers", () => {
    expect(publicVersionLabel("Version code 5")).toBeNull();
    expect(publicVersionLabel("1.0.5")).toBe("1.0.5");
  });

  it("describes slots without claiming testers when none have joined", () => {
    expect(slotsLabel(12, 12, 0)).toBe("12 testing slots available");
    expect(slotsLabel(9, 12, 3)).toBe("3 of 12 testers joined");
  });

  it("uses friendly closed-testing join copy", () => {
    expect(publicJoinDetail("CLOSED", "REGISTERED")).toMatch(/registered/i);
    expect(publicJoinDetail("CLOSED", "REGISTERED")).not.toMatch(/API/i);
  });

  it("strips package names from public page JSON", () => {
    const page = {
      slug: "app",
      campaignId: "camp_1",
      campaignName: "Test",
      appName: "Wisdom Quest",
      packageName: "com.wisdomquest.app",
      iconUrl: null,
      testingType: "CLOSED",
      trackLabel: "alpha",
      developerName: "Shahnawaz",
      country: "Pakistan",
      instructions: "Install the app",
      description: "Help test",
      versionLabel: "1.0.5",
      pageUrl: "https://example.com/test/app",
      durationDays: 14,
      targetTesters: 12,
      testersReceived: 0,
      remaining: 12,
      joinKind: "individual",
      publicAccessLabel: "Individual tester access",
      groupConfigured: false,
    } satisfies PublicTestingPage;
    const sanitized = sanitizePublicTestingPage(page);
    expect(JSON.stringify(sanitized)).not.toContain("com.wisdomquest.app");
    expect(JSON.stringify(sanitized)).not.toContain("camp_1");
    expect(sanitized.appName).toBe("Wisdom Quest");
  });

  it("strips package names from join results", () => {
    const result = {
      outcome: "REGISTERED",
      statusLabel: "Waiting for developer",
      detail: "Your tester request has been registered.",
      email: "a@gmail.com",
      appName: "Wisdom Quest",
      packageName: "com.wisdomquest.app",
      trackLabel: "alpha",
      developerName: "Shahnawaz",
      optInUrl: null,
      steps: [],
      mode: "PLAY_TRACK_TESTERS",
    } satisfies PublicJoinResult;
    const sanitized = sanitizePublicJoinResult(result);
    expect(JSON.stringify(sanitized)).not.toContain("com.wisdomquest.app");
    expect("packageName" in sanitized).toBe(false);
  });
});
