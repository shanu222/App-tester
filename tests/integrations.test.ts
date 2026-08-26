import { describe, expect, it } from "vitest";
import { facebookPageCapabilities, facebookManualGroupCapabilities } from "../src/lib/integrations/capabilities";
import { groupDiscoveryUnavailable } from "../src/lib/integrations/facebook";
import { manualGroupInstructions } from "../src/lib/integrations/groups";
import { testingLinkForPackage } from "../src/lib/integrations/play";

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

  it("returns exact manual Google Group steps", () => {
    const text = manualGroupInstructions("net360-testers@googlegroups.com", "tester@gmail.com");
    expect(text).toContain("Manual action required");
    expect(text).toContain("tester@gmail.com");
  });
});
