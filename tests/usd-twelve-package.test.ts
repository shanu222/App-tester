import { describe, expect, it } from "vitest";
import { formatPackageAmount } from "../src/lib/managed-testing/catalog";
import {
  USD_TWELVE_PACKAGE_CODE,
  USD_TWELVE_TESTER_COUNT,
  USD_TWELVE_TESTER_EMAILS,
  USD_TWELVE_WHATSAPP_HREF,
  formatUsd,
  isUsdTwelvePackage,
  usdTwelveProgressStatus,
  usdTwelveTesterLabel,
} from "../src/lib/managed-testing/usd-twelve";
import {
  usdTwelveAdminPurchasedEmail,
  usdTwelveTesterInviteEmail,
} from "../src/lib/notifications/templates";

describe("usd twelve package constants", () => {
  it("is exactly twelve unique tester emails", () => {
    const unique = new Set(USD_TWELVE_TESTER_EMAILS.map((email) => email.toLowerCase()));
    expect(USD_TWELVE_TESTER_EMAILS).toHaveLength(USD_TWELVE_TESTER_COUNT);
    expect(unique.size).toBe(12);
    expect(isUsdTwelvePackage(USD_TWELVE_PACKAGE_CODE)).toBe(true);
    expect(isUsdTwelvePackage("testers_12")).toBe(false);
    expect(usdTwelveTesterLabel(0)).toBe("Tester 01");
    expect(usdTwelveTesterLabel(11)).toBe("Tester 12");
  });

  it("formats the $10 price without treating it as PKR", () => {
    expect(formatUsd(10)).toContain("10");
    expect(formatPackageAmount(10, "USD")).toContain("10");
    expect(formatPackageAmount(7500, "PKR")).toContain("7");
  });

  it("maps tester progress without claiming Google verified installs", () => {
    expect(
      usdTwelveProgressStatus({
        invitationStatus: "SENT",
        confirmationStatus: "CONFIRMED",
        hasScreenshot: false,
      }),
    ).toBe("CONFIRMED");
    expect(
      usdTwelveProgressStatus({
        invitationStatus: "SENT",
        confirmationStatus: "CONFIRMED",
        hasScreenshot: true,
      }),
    ).toBe("SCREENSHOT RECEIVED");
    expect(
      usdTwelveProgressStatus({
        invitationStatus: "FAILED",
        confirmationStatus: "NOT_CONFIRMED",
        hasScreenshot: false,
      }),
    ).toBe("EMAIL_FAILED");
  });
});

describe("usd twelve emails", () => {
  it("sends an individual invite without other tester addresses", () => {
    const email = usdTwelveTesterInviteEmail({
      appName: "Wisdom Quest",
      developerName: "NET360 Labs",
      testingTypeLabel: "Closed",
      joinUrl: "https://play.google.com/apps/testing/example",
      confirmUrl: "https://www.testloop.org/managed-testing/confirm/token",
      whatsappHref: USD_TWELVE_WHATSAPP_HREF,
      whatsappDisplay: "+92 340 3318127",
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(email.subject).toBe("You're invited to test Wisdom Quest on TestLoop");
    expect(blob).toContain("JOIN / DOWNLOAD TEST APP");
    expect(blob).toContain("WHATSAPP TESTING REPORT");
    expect(blob).toContain(USD_TWELVE_WHATSAPP_HREF);
    expect(blob).toContain("Confirm testing");
    expect(blob).not.toMatch(/cc:|bcc:/i);
    expect(blob).not.toMatch(/buy(ing)? installs/i);
    expect(blob).not.toMatch(/guaranteed installs/i);
    for (const other of USD_TWELVE_TESTER_EMAILS) {
      expect(blob.toLowerCase()).not.toContain(other.toLowerCase());
    }
  });

  it("notifies admin of a purchase without install-buying language", () => {
    const email = usdTwelveAdminPurchasedEmail({
      developerName: "Ada",
      developerEmail: "ada@example.com",
      appName: "Wisdom Quest",
      amountLabel: "$10",
      paymentStatus: "APPROVED",
      campaignId: "mtc_test",
      purchaseDate: "29 Aug 2026",
      startDate: "29 Aug 2026",
      endDate: "12 Sep 2026",
      campaignUrl: "https://www.testloop.org/managed-testing/mtc_test",
    });
    expect(email.subject).toBe("New TestLoop Paid Testing Package Purchased");
    expect(email.text).toContain("12 Testers / 14 Days");
    expect(email.text).toContain("$10");
    expect(email.text).not.toMatch(/buy(ing)? installs/i);
  });
});
