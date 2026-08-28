import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../src/lib/status";

describe("tester status transitions", () => {
  it("allows the core campaign path", () => {
    expect(canTransition("DISCOVERED", "CONTACTED")).toBe(true);
    expect(canTransition("CONTACTED", "REPLIED")).toBe(true);
    expect(canTransition("REPLIED", "EMAIL_RECEIVED")).toBe(true);
    expect(canTransition("EMAIL_CONFIRMED", "ADDING")).toBe(true);
    expect(canTransition("EMAIL_CONFIRMED", "OPT_IN_PENDING")).toBe(true);
    expect(canTransition("ADDED", "INVITATION_SENT")).toBe(true);
    expect(canTransition("OPTED_IN", "TESTING")).toBe(true);
  });

  it("rejects skipped states", () => {
    expect(canTransition("DISCOVERED", "OPTED_IN")).toBe(false);
    expect(() => assertTransition("DISCOVERED", "TESTING")).toThrow(/Invalid tester status/);
  });

  it("treats declined as mostly terminal", () => {
    expect(canTransition("DECLINED", "CONTACTED")).toBe(false);
    expect(canTransition("DECLINED", "BLOCKED")).toBe(true);
  });
});
