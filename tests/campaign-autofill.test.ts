import { describe, expect, it } from "vitest";
import {
  defaultDurationDays,
  defaultRequestDescription,
  defaultRequestName,
  defaultTargetTesters,
  defaultTestingInstructions,
  testingTypeExplanation,
  testingTypeLabel,
} from "../src/lib/campaign-autofill";

describe("campaign autofill", () => {
  it("names the request from the detected testing type", () => {
    expect(defaultRequestName("AI Phone Doctor", "CLOSED")).toBe("AI Phone Doctor — Closed Testing");
    expect(defaultRequestName("AI Phone Doctor", "OPEN")).toBe("AI Phone Doctor — Open Testing");
    expect(defaultRequestName("AI Phone Doctor", "INTERNAL")).toBe(
      "AI Phone Doctor — Internal Testing",
    );
  });

  it("uses Play release notes when they exist and a TestLoop default otherwise", () => {
    expect(defaultRequestDescription("AI Phone Doctor", " Bug fixes ")).toBe("Bug fixes");
    expect(defaultRequestDescription("AI Phone Doctor")).toMatch(/currently available for testing/);
  });

  it("keeps type-specific instructions distinct", () => {
    expect(defaultTestingInstructions("OPEN")).toMatch(/join the test/i);
    expect(defaultTestingInstructions("CLOSED")).toMatch(/closed test/i);
    expect(defaultTestingInstructions("INTERNAL")).toMatch(/internal testing/i);
  });

  it("explains the detected Play mode without asking for Play passwords", () => {
    expect(testingTypeLabel("CLOSED")).toBe("Closed testing");
    expect(testingTypeExplanation("CLOSED").body).not.toMatch(/password/i);
    expect(testingTypeExplanation("OPEN").title).toMatch(/Open testing/i);
    expect(testingTypeExplanation("INTERNAL").title).toMatch(/Internal testing/i);
  });

  it("treats tester target and duration as TestLoop campaign settings", () => {
    expect(defaultTargetTesters(undefined)).toBe(12);
    expect(defaultTargetTesters(20)).toBe(20);
    expect(defaultDurationDays()).toBe(14);
  });
});
