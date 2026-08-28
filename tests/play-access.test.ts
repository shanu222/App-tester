import { describe, expect, it } from "vitest";
import type { PlayTrackRecord } from "../src/lib/integrations/types";
import {
  detectTrackAccess,
  googleGroupJoinUrl,
} from "../src/lib/integrations/play-access";

function track(overrides: Partial<PlayTrackRecord> = {}): PlayTrackRecord {
  return {
    track: "alpha",
    typeGuess: "CLOSED",
    displayName: "Closed testing (alpha)",
    releaseName: "1.0",
    versionCodes: ["1"],
    releaseStatus: "completed",
    userFraction: null,
    releaseNotes: null,
    googleGroupCount: null,
    googleGroups: null,
    ...overrides,
  };
}

describe("googleGroupJoinUrl", () => {
  it("builds a Groups URL from a googlegroups address and never invents one", () => {
    expect(googleGroupJoinUrl("qa-testers@googlegroups.com")).toBe(
      "https://groups.google.com/g/qa-testers",
    );
    expect(googleGroupJoinUrl("person@gmail.com")).toBeNull();
    expect(googleGroupJoinUrl("")).toBeNull();
  });
});

describe("detectTrackAccess", () => {
  it("treats open testing as open regardless of tester resource data", () => {
    const access = detectTrackAccess("OPEN", track({ googleGroupCount: 2, googleGroups: ["qa@googlegroups.com"] }));
    expect(access.method).toBe("open");
    expect(access.joinKind).toBe("open");
    expect(access.individualEnrollmentApplicable).toBe(false);
  });

  it("detects a configured Google Group on a closed track", () => {
    const access = detectTrackAccess(
      "CLOSED",
      track({ googleGroupCount: 1, googleGroups: ["qa-testers@googlegroups.com"] }),
    );
    expect(access.method).toBe("google_group");
    expect(access.joinKind).toBe("google_group");
    expect(access.groupConfigured).toBe(true);
    expect(access.publicAccessLabel).toBe("Google Group testing available");
    expect(access.groupJoinUrl).toBe("https://groups.google.com/g/qa-testers");
    expect(access.individualEnrollmentApplicable).toBe(false);
  });

  it("detects individual tester access when Play reported zero groups", () => {
    const access = detectTrackAccess("CLOSED", track({ googleGroupCount: 0, googleGroups: [] }));
    expect(access.method).toBe("individual");
    expect(access.joinKind).toBe("individual");
    expect(access.groupConfigured).toBe(false);
    expect(access.publicAccessLabel).toBe("Individual tester access");
  });

  it("does not assume a group when the testers API did not return configuration", () => {
    const access = detectTrackAccess("CLOSED", track());
    expect(access.method).toBe("unknown");
    expect(access.groupConfigured).toBe("unknown");
    expect(access.publicAccessLabel).toBe("Google Group status unavailable");
    expect(access.joinKind).toBe("individual");
    expect(access.groupJoinUrl).toBeNull();
  });

  it("keeps internal testing distinct from open testing", () => {
    const access = detectTrackAccess("INTERNAL", track({ track: "internal", typeGuess: "INTERNAL", googleGroupCount: 0, googleGroups: [] }));
    expect(access.method).toBe("internal");
    expect(access.joinKind).toBe("individual");
  });

  it("uses a stored group email when the snapshot has a count but no addresses", () => {
    const access = detectTrackAccess("CLOSED", track({ googleGroupCount: 1, googleGroups: null }), {
      googleGroupEmail: "legacy@googlegroups.com",
    });
    expect(access.groupConfigured).toBe(true);
    expect(access.groupJoinUrl).toBe("https://groups.google.com/g/legacy");
  });
});
