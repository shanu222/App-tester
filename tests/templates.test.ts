import { describe, expect, it } from "vitest";
import { generateReply, renderTemplate } from "../src/lib/templates";

describe("templates", () => {
  it("does not claim testing is complete", () => {
    const reply = generateReply("professional");
    expect(reply.toLowerCase()).not.toContain("i have already tested");
    expect(reply.toLowerCase()).not.toContain("you have been added");
  });

  it("leaves unavailable testing links explicit", () => {
    const body = renderTemplate("Join: {{testingLink}}", { testingLink: undefined });
    expect(body).toContain("[testingLink unavailable]");
  });
});
