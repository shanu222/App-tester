import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "../src/lib/slug";
import { campaignTestingUrl, playOptInUrl, testerAccessMode } from "../src/lib/integrations/play-testers";

describe("slugify", () => {
  it("turns an app name into a URL-safe slug", () => {
    expect(slugify("NET360 Internal Testing")).toBe("net360-internal-testing");
    expect(slugify("  My App!! ")).toBe("my-app");
  });

  it("allocates a numeric suffix when the base slug is taken", async () => {
    const taken = new Set(["net360", "net360-2"]);
    const slug = await uniqueSlug("NET360", async (candidate) => taken.has(candidate));
    expect(slug).toBe("net360-3");
  });
});

describe("campaign testing URL", () => {
  it("uses a configured Play Console link when one exists", () => {
    expect(
      campaignTestingUrl({
        testingType: "INTERNAL",
        packageName: "com.example.app",
        configuredUrl: "https://play.google.com/apps/internaltest/abc",
      }),
    ).toEqual({ url: "https://play.google.com/apps/internaltest/abc", reason: null });
  });

  it("builds Google's opt-in URL for open and closed tracks", () => {
    expect(playOptInUrl("com.example.app")).toBe("https://play.google.com/apps/testing/com.example.app");
    expect(
      campaignTestingUrl({ testingType: "OPEN", packageName: "com.example.app" }).url,
    ).toBe("https://play.google.com/apps/testing/com.example.app");
    expect(
      campaignTestingUrl({ testingType: "CLOSED", packageName: "com.example.app" }).url,
    ).toBe("https://play.google.com/apps/testing/com.example.app");
  });

  it("does not invent an internal testing link", () => {
    const result = campaignTestingUrl({ testingType: "INTERNAL", packageName: "com.example.app" });
    expect(result.url).toBeNull();
    expect(result.reason).toMatch(/internaltest/i);
  });

  it("does not invent an opt-in URL for a manual app without a package name", () => {
    const result = campaignTestingUrl({ testingType: "OPEN", packageName: null });
    expect(result.url).toBeNull();
    expect(result.reason).toMatch(/No testing link/i);
  });

  it("marks open testing as opt-in and closed/internal as Play track testers", () => {
    expect(testerAccessMode("OPEN")).toBe("OPEN_OPT_IN");
    expect(testerAccessMode("CLOSED")).toBe("PLAY_TRACK_TESTERS");
    expect(testerAccessMode("INTERNAL")).toBe("PLAY_TRACK_TESTERS");
  });
});
