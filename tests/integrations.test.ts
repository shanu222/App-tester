import { describe, expect, it } from "vitest";
import { facebookPageCapabilities, facebookManualGroupCapabilities } from "../src/lib/integrations/capabilities";
import { groupDiscoveryUnavailable } from "../src/lib/integrations/facebook";
import { testingLinkForPackage } from "../src/lib/integrations/play";
import {
  PLAY_TESTER_API_LIMITATION,
  playConsoleTesterSteps,
  playOptInUrl,
  testerAccessMode,
} from "../src/lib/integrations/play-testers";

describe("integration honesty", () => {
  it("does not claim Facebook Group APIs exist", () => {
    const caps = facebookManualGroupCapabilities();
    expect(caps["facebook.groups.read"]).toBe(false);
    expect(caps["facebook.groups.comment"]).toBe(false);
    const result = groupDiscoveryUnavailable();
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.unavailable).toBe(true);
    }
  });

  it("enables Page comment capabilities when a Page is connected", () => {
    expect(facebookPageCapabilities()["facebook.pages.comment"]).toBe(true);
  });

  it("does not invent testing links", () => {
    expect(testingLinkForPackage("")).toBeNull();
    expect(testingLinkForPackage("com.example.net360")).toBe(
      "https://play.google.com/apps/testing/com.example.net360",
    );
  });

  it("only automates tester access for open testing", () => {
    expect(testerAccessMode("OPEN")).toBe("AUTOMATIC");
    expect(testerAccessMode("CLOSED")).toBe("MANUAL_EMAIL_LIST");
    expect(testerAccessMode("INTERNAL")).toBe("MANUAL_EMAIL_LIST");
  });

  it("explains the Play testers API limitation rather than claiming automation", () => {
    expect(PLAY_TESTER_API_LIMITATION).toContain("Google Groups only");
    const steps = playConsoleTesterSteps("CLOSED");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.join(" ")).toContain("Closed testing");
    expect(playConsoleTesterSteps("INTERNAL").join(" ")).toContain("Internal testing");
  });

  it("uses Google's own opt-in URL and never a TestLoop-hosted download", () => {
    expect(playOptInUrl("")).toBeNull();
    expect(playOptInUrl("com.example.net360")).toBe(
      "https://play.google.com/apps/testing/com.example.net360",
    );
  });
});
