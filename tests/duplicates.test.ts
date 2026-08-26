import { describe, expect, it } from "vitest";

function duplicateKey(email: string, campaignId: string) {
  return `${email.trim().toLowerCase()}::${campaignId}`;
}

describe("duplicate protection", () => {
  it("treats the same email+campaign as a duplicate", () => {
    const first = duplicateKey("Tester@Gmail.com", "camp_1");
    const second = duplicateKey(" tester@gmail.com ", "camp_1");
    expect(first).toBe(second);
  });

  it("allows the same tester on a different campaign", () => {
    expect(duplicateKey("tester@gmail.com", "camp_1")).not.toBe(
      duplicateKey("tester@gmail.com", "camp_2"),
    );
  });
});
