import { describe, expect, it } from "vitest";
import { isGoogleGroupAddress, mergeGoogleGroups, PLAY_TESTER_API_LIMITATION } from "../src/lib/integrations/play-testers";
import { enrollPlayTrackTester } from "../src/lib/integrations/play";

describe("Play tester enrollment honesty", () => {
  it("does not treat a consumer Gmail as a Google Group", () => {
    expect(isGoogleGroupAddress("developerB@gmail.com")).toBe(false);
    expect(isGoogleGroupAddress("team@googlegroups.com")).toBe(true);
  });

  it("never writes a Play testers list for closed or internal Gmail", async () => {
    const closed = await enrollPlayTrackTester({
      creds: { method: "SERVICE_ACCOUNT", serviceAccount: { client_email: "x", private_key: "y" } },
      packageName: "com.example.app",
      track: "alpha",
      email: "tester@gmail.com",
      testingType: "CLOSED",
    });
    expect(closed.ok).toBe(false);
    expect(closed.outcome).toBe("UNSUPPORTED");
    expect(closed.error).toBe(PLAY_TESTER_API_LIMITATION);

    const internal = await enrollPlayTrackTester({
      creds: { method: "SERVICE_ACCOUNT", serviceAccount: { client_email: "x", private_key: "y" } },
      packageName: "com.example.app",
      track: "internal",
      email: "tester@gmail.com",
      testingType: "INTERNAL",
    });
    expect(internal.ok).toBe(false);
    expect(internal.outcome).toBe("UNSUPPORTED");
  });

  it("records open testing without claiming a tester-list write", async () => {
    const open = await enrollPlayTrackTester({
      creds: { method: "SERVICE_ACCOUNT", serviceAccount: { client_email: "x", private_key: "y" } },
      packageName: "com.example.app",
      track: "beta",
      email: "tester@gmail.com",
      testingType: "OPEN",
    });
    expect(open.ok).toBe(true);
    expect(open.outcome).toBe("OPEN_OPT_IN");
  });

  it("keeps mergeGoogleGroups as a non-product helper that never replaces existing groups", () => {
    const first = mergeGoogleGroups(["qa-testers@googlegroups.com"], "QA-Testers@googlegroups.com");
    expect(first.alreadyPresent).toBe(true);
  });
});
