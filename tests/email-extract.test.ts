import { describe, expect, it } from "vitest";
import { extractEmails, isValidEmailSyntax, normalizeEmail, preferredPlayEmail } from "../src/lib/email-extract";

describe("email extraction", () => {
  it("normalizes and prefers Gmail", () => {
    const emails = extractEmails("Sure, my Gmail is  Tester@Gmail.com  and also other@example.com");
    expect(emails[0].normalized).toBe("tester@gmail.com");
    expect(emails[0].isGmail).toBe(true);
    expect(preferredPlayEmail(emails)?.normalized).toBe("tester@gmail.com");
  });

  it("accepts googlemail.com", () => {
    const emails = extractEmails("use john123@googlemail.com");
    expect(emails[0].isGmail).toBe(true);
    expect(normalizeEmail("  John123@GoogleMail.com ")).toBe("john123@googlemail.com");
  });

  it("rejects invalid syntax", () => {
    expect(isValidEmailSyntax("not-an-email")).toBe(false);
    expect(isValidEmailSyntax("a@b.c")).toBe(false);
  });
});
