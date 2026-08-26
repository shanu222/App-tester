import { describe, expect, it } from "vitest";
import { parsePlayStoreUrl, validatePlayStoreUrl } from "../src/lib/play-url";
import { RESILIENCE_APPS } from "../src/lib/catalog/resilience-apps";
import { generateRecruitmentPost, gmailRequestReply } from "../src/lib/templates";

describe("play store URLs", () => {
  it("accepts official details URLs and extracts the package", () => {
    const parsed = parsePlayStoreUrl("https://play.google.com/store/apps/details?id=com.aiphonedoctor.app");
    expect(parsed?.packageName).toBe("com.aiphonedoctor.app");
    expect(parsed?.canonical).toBe("https://play.google.com/store/apps/details?id=com.aiphonedoctor.app");
  });

  it("rejects a package/URL mismatch", () => {
    const result = validatePlayStoreUrl(
      "com.example.test",
      "https://play.google.com/store/apps/details?id=com.example.other",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Package name does not match the Google Play URL.");
  });

  it("rejects non-Play URLs", () => {
    const result = validatePlayStoreUrl("com.example.app", "https://example.com/app");
    expect(result.ok).toBe(false);
  });
});

describe("catalog apps", () => {
  it("contains unique package names for the Resilience apps", () => {
    const packages = RESILIENCE_APPS.map((app) => app.packageName);
    expect(new Set(packages).size).toBe(packages.length);
    expect(packages).toContain("com.net360prep.app");
    expect(RESILIENCE_APPS.find((app) => app.packageName === "com.net360prep.app")?.googlePlayStatus).toBe(
      "PRODUCTION",
    );
    expect(RESILIENCE_APPS.find((app) => app.packageName === "com.net360prep.app")?.createCampaign).toBe(false);
  });
});

describe("recruitment posts", () => {
  it("names the selected app and does not invent a testing opt-in URL", () => {
    const body = generateRecruitmentPost({
      appName: "AI Phone Doctor",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.aiphonedoctor.app",
    });
    expect(body).toContain("AI Phone Doctor");
    expect(body).toContain("https://play.google.com/store/apps/details?id=com.aiphonedoctor.app");
    expect(body).not.toContain("play.google.com/apps/testing");
    expect(gmailRequestReply("AI Phone Doctor")).toContain("Gmail");
  });
});
