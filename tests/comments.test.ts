import { describe, expect, it } from "vitest";
import { generateReply } from "../src/lib/templates";

describe("comment approval content", () => {
  it("asks for Gmail and never claims the tester was already added", () => {
    for (const tone of ["professional", "friendly", "short", "developer-to-developer"]) {
      const body = generateReply(tone).toLowerCase();
      expect(body).toContain("gmail");
      expect(body).not.toContain("already added");
      expect(body).not.toContain("i already tested");
    }
  });
});
