import { describe, expect, it } from "vitest";
import { isGoogleGroupAddress, mergeGoogleGroups } from "../src/lib/integrations/play-testers";

describe("Play tester group merge", () => {
  it("keeps existing Google Groups and is case-insensitive", () => {
    const first = mergeGoogleGroups(["qa-testers@googlegroups.com"], "QA-Testers@googlegroups.com");
    expect(first.alreadyPresent).toBe(true);
    expect(first.groups).toEqual(["qa-testers@googlegroups.com"]);

    const second = mergeGoogleGroups(["qa-testers@googlegroups.com"], "beta-testers@googlegroups.com");
    expect(second.alreadyPresent).toBe(false);
    expect(second.groups).toEqual(["qa-testers@googlegroups.com", "beta-testers@googlegroups.com"]);
  });

  it("does not treat a consumer Gmail as a Google Group", () => {
    expect(isGoogleGroupAddress("developerB@gmail.com")).toBe(false);
    expect(isGoogleGroupAddress("team@googlegroups.com")).toBe(true);
  });
});
