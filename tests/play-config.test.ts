import { describe, expect, it } from "vitest";
import type { PlayTrackRecord } from "../src/lib/integrations/types";
import {
  classifyPlayTrack,
  detectTestingConfiguration,
  playTrackDisplayName,
  playTrackUiStatus,
  recommendTestingMode,
} from "../src/lib/integrations/play-config";

function track(
  name: string,
  overrides: Partial<PlayTrackRecord> = {},
): PlayTrackRecord {
  const typeGuess = classifyPlayTrack(name);
  return {
    track: name,
    typeGuess,
    displayName: playTrackDisplayName(name, typeGuess),
    releaseName: null,
    versionCodes: [],
    releaseStatus: "completed",
    userFraction: null,
    releaseNotes: null,
    googleGroupCount: null,
    ...overrides,
  };
}

describe("classifyPlayTrack", () => {
  it("maps Google's standard track ids", () => {
    expect(classifyPlayTrack("production")).toBe("PRODUCTION");
    expect(classifyPlayTrack("beta")).toBe("OPEN");
    expect(classifyPlayTrack("qa")).toBe("INTERNAL");
    expect(classifyPlayTrack("internal")).toBe("INTERNAL");
  });

  it("treats custom names as closed testing, including names that are not 'closed'", () => {
    expect(classifyPlayTrack("qa-team")).toBe("CLOSED");
    expect(classifyPlayTrack("clients")).toBe("CLOSED");
    expect(classifyPlayTrack("university-testers")).toBe("CLOSED");
    expect(classifyPlayTrack("private-beta")).toBe("CLOSED");
    expect(classifyPlayTrack("external-testers")).toBe("CLOSED");
    expect(classifyPlayTrack("closed-testing")).toBe("CLOSED");
    expect(classifyPlayTrack("partners")).toBe("CLOSED");
    expect(classifyPlayTrack("alpha")).toBe("CLOSED");
  });
});

describe("detectTestingConfiguration", () => {
  it("discovers every mode from the real track list and keeps closed tracks separate", () => {
    const config = detectTestingConfiguration([
      track("qa"),
      track("university-testers", { releaseName: "1.4.1" }),
      track("clients", { releaseName: "1.3.9" }),
      track("beta"),
      track("production"),
    ]);
    expect(config.internalTesting.exists).toBe(true);
    expect(config.openTesting.exists).toBe(true);
    expect(config.closedTesting.exists).toBe(true);
    expect(config.production.exists).toBe(true);
    expect(config.closedTesting.tracks.map((item) => item.track)).toEqual([
      "university-testers",
      "clients",
    ]);
    expect(config.testingTrackCount).toBe(4);
  });

  it("does not treat a configured track without a live release as active", () => {
    const config = detectTestingConfiguration([
      track("beta", { releaseStatus: "draft", versionCodes: [] }),
    ]);
    expect(config.openTesting.exists).toBe(true);
    expect(config.openTesting.active).toBe(false);
  });

  it("reports no testing when only production exists", () => {
    const config = detectTestingConfiguration([track("production")]);
    expect(config.testingTrackCount).toBe(0);
    expect(config.production.exists).toBe(true);
  });
});

describe("recommendTestingMode", () => {
  it("recommends open testing when that is the only testing track", () => {
    const rec = recommendTestingMode(detectTestingConfiguration([track("beta")]));
    expect(rec.primary).toBe("OPEN");
    expect(rec.cta).toContain("Open");
  });

  it("recommends internal testing and offers open testing as an alternative", () => {
    const rec = recommendTestingMode(detectTestingConfiguration([track("qa")]));
    expect(rec.primary).toBe("INTERNAL");
    expect(rec.alternatives.some((item) => item.kind === "OPEN")).toBe(true);
  });

  it("asks the developer to choose when several closed tracks exist", () => {
    const rec = recommendTestingMode(
      detectTestingConfiguration([track("qa-team"), track("partners")]),
    );
    expect(rec.primary).toBe("CHOOSE");
    expect(rec.alternatives).toHaveLength(2);
  });

  it("does not force a single path when internal, closed and open all exist", () => {
    const rec = recommendTestingMode(
      detectTestingConfiguration([track("qa"), track("clients"), track("beta")]),
    );
    expect(rec.primary).toBe("OPEN");
    expect(rec.ambiguous).toBe(true);
    expect(rec.alternatives.some((item) => item.kind === "CLOSED")).toBe(true);
  });

  it("reports that no testing track was found", () => {
    const rec = recommendTestingMode(detectTestingConfiguration([track("production")]));
    expect(rec.primary).toBe("NONE");
  });
});

describe("playTrackUiStatus", () => {
  it("distinguishes live releases from a track that merely exists", () => {
    expect(playTrackUiStatus({ exists: true, releaseStatus: "completed" }).label).toBe("Active");
    expect(playTrackUiStatus({ exists: true, releaseStatus: "draft" }).label).toBe("Draft");
    expect(playTrackUiStatus({ exists: true, releaseStatus: null }).label).toBe("Track configured");
    expect(playTrackUiStatus({ exists: false, releaseStatus: null }).label).toBe("Not configured");
  });
});
