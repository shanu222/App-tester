import { describe, expect, it } from "vitest";
import { matchExplanation } from "../src/lib/services/network";

describe("developer matching", () => {
  it("scores from documented reasons only", () => {
    const result = matchExplanation({
      reciprocalOpen: true,
      sameCountry: true,
      remaining: 4,
      playConnected: true,
      testerLoad: 1,
      testingType: "CLOSED",
    });
    expect(result.score).toBe(100);
    expect(result.parts.map((part) => part.reason)).toEqual([
      "Reciprocal testing open",
      "Same country",
      "Closed testing campaign",
      "Still needs testers",
      "Owner has Google Play connected",
      "Your current testing load is low",
    ]);
  });

  it("does not invent a high score when nothing matches", () => {
    const result = matchExplanation({
      reciprocalOpen: false,
      sameCountry: false,
      remaining: 0,
      playConnected: false,
      testerLoad: 12,
      testingType: "OPEN",
    });
    expect(result.score).toBe(0);
    expect(result.parts).toEqual([]);
  });
});
