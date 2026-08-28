import { describe, expect, it } from "vitest";
import { formatPkr, MANAGED_TESTING_COMPLIANCE, packageHeadline } from "../src/lib/managed-testing/catalog";
import { validateManagedCampaignSetup, fieldsForManagedTestingType } from "../src/lib/managed-testing/setup";
import { campaignDayProgress, ASSIGNMENT_STATUS_LABELS } from "../src/lib/managed-testing/labels";
import { managedTestingStubPaymentsAllowed } from "../src/lib/managed-testing/payments";
import { managedTesterInviteEmail, managedTestingDailyReportEmail } from "../src/lib/notifications/templates";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/lib/notifications/preferences";

describe("managed testing catalog", () => {
  it("formats PKR prices for the published packages", () => {
    expect(formatPkr(7500)).toContain("7");
    expect(formatPkr(11500)).toContain("11");
    expect(packageHeadline(12, false)).toBe("12 testers");
    expect(packageHeadline(0, true)).toBe("Custom");
  });

  it("does not market installs, fake users, or Play ranking manipulation", () => {
    const copy = MANAGED_TESTING_COMPLIANCE.toLowerCase();
    expect(copy).toContain("consenting");
    expect(copy).not.toMatch(/buy(ing)? installs/);
    expect(copy).not.toMatch(/fake users/);
    expect(copy).not.toMatch(/guaranteed downloads/);
    expect(copy).not.toMatch(/rankings/);
  });
});

describe("managed campaign setup", () => {
  it("only requires a testing link for the selected type", () => {
    expect(fieldsForManagedTestingType("OPEN").testingUrl).toBe(true);
    expect(fieldsForManagedTestingType("CLOSED").requiredTestersNote).toBe(true);
    expect(validateManagedCampaignSetup({ testingType: "CLOSED", testingUrl: "" }).ok).toBe(false);
    expect(
      validateManagedCampaignSetup({
        testingType: "OPEN",
        testingUrl: "https://play.google.com/apps/testing/example",
      }).ok,
    ).toBe(true);
  });
});

describe("managed testing progress", () => {
  it("counts campaign days without claiming an install", () => {
    const started = new Date("2026-08-01T00:00:00.000Z");
    const progress = campaignDayProgress(started, 14, new Date("2026-08-06T12:00:00.000Z"));
    expect(progress.day).toBeGreaterThanOrEqual(5);
    expect(progress.durationDays).toBe(14);
    expect(ASSIGNMENT_STATUS_LABELS.CONFIRMED).toBe("Tester confirmed installation");
    expect(ASSIGNMENT_STATUS_LABELS.CONFIRMED.toLowerCase()).not.toBe("installed");
  });
});

describe("managed testing emails", () => {
  it("invites testers without package ids or install-buying language", () => {
    const email = managedTesterInviteEmail({
      testerName: "Ayesha",
      appName: "Wisdom Quest",
      testingTypeLabel: "Closed testing",
      developerName: "NET360 Labs",
      joinUrl: "https://play.google.com/apps/testing/example",
      confirmUrl: "https://www.testloop.org/managed-testing/join/token",
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(email.subject).toBe("You're invited to test Wisdom Quest");
    expect(blob).toContain("Join Test");
    expect(blob).not.toMatch(/com\.[a-z0-9]+/i);
    expect(blob).not.toMatch(/buy(ing)? installs/i);
    expect(blob).not.toContain("packageId");
  });

  it("sends a daily testing report with action required copy", () => {
    const email = managedTestingDailyReportEmail({
      appName: "Wisdom Quest",
      day: 6,
      durationDays: 14,
      assigned: 12,
      invitationsSent: 12,
      optedIn: 10,
      confirmed: 8,
      pending: 2,
      remaining: 8,
      campaignUrl: "https://www.testloop.org/managed-testing/abc",
    });
    expect(email.subject).toBe("TESTLOOP — DAILY TESTING REPORT");
    expect(email.text).toContain("2 testers are still pending");
    expect(email.text).not.toMatch(/SMTP_/);
  });
});

describe("managed testing payments", () => {
  it("does not allow stub confirmation in production", () => {
    if (process.env.NODE_ENV === "production") {
      expect(managedTestingStubPaymentsAllowed()).toBe(false);
    }
  });

  it("enables managed testing alerts by default", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.managedTesting).toBe(true);
  });
});
