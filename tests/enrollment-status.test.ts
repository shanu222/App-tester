import { describe, expect, it } from "vitest";
import { enrollmentStatus } from "../src/lib/enrollment-status";

describe("enrollmentStatus", () => {
  it("labels waiting testers as pending developer, not as added on Google Play", () => {
    const waiting = enrollmentStatus({
      status: "MANUAL_REQUIRED",
      playEnrollmentStatus: "UNSUPPORTED",
    });
    expect(waiting.key).toBe("pending_developer");
    expect(waiting.ownerLabel).toBe("Waiting for Developer");
    expect(waiting.testerLabel).toBe("Pending Developer");
  });

  it("uses developer confirmation until Play actually verifies membership", () => {
    const confirmed = enrollmentStatus({
      status: "INVITATION_READY",
      playEnrollmentStatus: "UNSUPPORTED",
      confirmedAt: new Date("2026-08-28T11:00:00.000Z"),
    });
    expect(confirmed.key).toBe("developer_confirmed");
    expect(confirmed.testerLabel).toBe("Developer Confirmed");

    const verified = enrollmentStatus({
      status: "INVITATION_READY",
      playEnrollmentStatus: "VERIFIED",
      confirmedAt: new Date("2026-08-28T11:00:00.000Z"),
    });
    expect(verified.key).toBe("play_verified");
    expect(verified.testerLabel).toBe("Google Play Verified");
  });

  it("does not treat a developer click as Google Play verified", () => {
    const confirmed = enrollmentStatus({
      status: "ADDED",
      playEnrollmentStatus: "UNSUPPORTED",
      confirmedAt: new Date(),
    });
    expect(confirmed.key).not.toBe("play_verified");
    expect(confirmed.key).not.toBe("ready");
  });
});
