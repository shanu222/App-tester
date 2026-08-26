import { describe, expect, it } from "vitest";
import { scorePost, relevanceLabel } from "../src/lib/scoring";

describe("opportunity scoring", () => {
  it("scores an explicit reciprocal Android closed-testing request highly", () => {
    const result = scorePost({
      message:
        "I have built an Android app and need testers for Google Play closed testing. I can test yours too.",
      postedAt: new Date(),
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reciprocal).toBe(true);
    expect(relevanceLabel(result.score)).toBe("HIGH MATCH");
    expect(result.whyMatched.length).toBeGreaterThan(0);
  });

  it("penalizes job ads and already processed posts", () => {
    const result = scorePost({
      message: "We are hiring a full-time Android developer. Salary competitive.",
      alreadyProcessed: true,
      duplicateContent: true,
    });
    expect(result.score).toBeLessThan(40);
    expect(result.penalties).toContain("Job posting");
    expect(result.penalties).toContain("Already processed");
  });
});
