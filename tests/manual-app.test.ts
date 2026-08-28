import { describe, expect, it } from "vitest";
import {
  connectionLabel,
  isManualApp,
  manualFieldsForType,
  optionalHttpUrl,
  parseManualGroupInput,
  uniqueTestingTypes,
} from "../src/lib/manual-app";
import { campaignTestingUrl } from "../src/lib/integrations/play-testers";

describe("manual app helpers", () => {
  it("labels connection without implying Play verification", () => {
    expect(connectionLabel(true)).toBe("Google Play Connected");
    expect(connectionLabel(false)).toBe("Manual");
    expect(isManualApp({ syncedFromPlay: false, playTrack: null })).toBe(true);
    expect(isManualApp({ syncedFromPlay: true })).toBe(false);
  });

  it("shows only the fields needed for each testing type", () => {
    expect(manualFieldsForType("INTERNAL")).toEqual({
      downloadLink: true,
      playTestingLink: false,
      googleGroup: false,
    });
    expect(manualFieldsForType("CLOSED")).toEqual({
      downloadLink: false,
      playTestingLink: true,
      googleGroup: true,
    });
    expect(manualFieldsForType("OPEN")).toEqual({
      downloadLink: false,
      playTestingLink: true,
      googleGroup: false,
    });
  });

  it("accepts a Google Group email or groups.google.com link", () => {
    expect(parseManualGroupInput("QA-Testers@googlegroups.com")).toEqual({
      email: "qa-testers@googlegroups.com",
      joinUrl: "https://groups.google.com/g/qa-testers",
      error: null,
    });
    expect(parseManualGroupInput("https://groups.google.com/g/closed-testers")).toEqual({
      email: "closed-testers@googlegroups.com",
      joinUrl: "https://groups.google.com/g/closed-testers",
      error: null,
    });
    expect(parseManualGroupInput("https://example.com/not-a-group").error).toMatch(/Google Group/i);
    expect(parseManualGroupInput("").email).toBeNull();
  });

  it("rejects invalid optional links and keeps empty values optional", () => {
    expect(optionalHttpUrl("")).toEqual({ ok: true, url: null });
    expect(optionalHttpUrl("https://play.google.com/apps/testing/demo").ok).toBe(true);
    expect(optionalHttpUrl("not-a-url").ok).toBe(false);
  });

  it("does not invent a Play testing URL without a package name", () => {
    expect(campaignTestingUrl({ testingType: "OPEN", packageName: null }).url).toBeNull();
    expect(campaignTestingUrl({ testingType: "CLOSED" }).reason).toMatch(/No testing link/i);
    expect(
      campaignTestingUrl({
        testingType: "INTERNAL",
        configuredUrl: "https://example.com/build.apk",
      }).url,
    ).toBe("https://example.com/build.apk");
  });

  it("collects distinct testing types for My Apps", () => {
    expect(uniqueTestingTypes("CLOSED", [{ testingType: "OPEN" }, { testingType: "CLOSED" }])).toEqual([
      "CLOSED",
      "OPEN",
    ]);
  });
});
