import { describe, expect, it } from "vitest";
import { formatPkr, MANAGED_TESTING_COMPLIANCE, packageHeadline } from "../src/lib/managed-testing/catalog";
import { validateManagedCampaignSetup, fieldsForManagedTestingType } from "../src/lib/managed-testing/setup";
import { campaignDayProgress, ASSIGNMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../src/lib/managed-testing/labels";
import { managedTestingStubPaymentsAllowed } from "../src/lib/managed-testing/payments";
import {
  paymentCanSubmitProof,
  paymentIsActivated,
  paymentMethods,
  revenueCatConfigured,
  validatePaymentProof,
} from "../src/lib/managed-testing/methods";
import {
  adminPaymentReviewEmail,
  developerPaymentApprovedEmail,
  developerPaymentRejectedEmail,
  managedTesterInviteEmail,
  managedTestingDailyReportEmail,
} from "../src/lib/notifications/templates";
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

  it("lists wallet, Binance, and RevenueCat methods without activating from the browser", () => {
    const methods = paymentMethods();
    expect(methods.map((item) => item.id)).toEqual([
      "EASYPAISA",
      "JAZZCASH",
      "SADAPAY",
      "NAYAPAY",
      "BINANCE_USDT",
      "REVENUECAT",
    ]);
    expect(methods.find((item) => item.id === "EASYPAISA")?.copyValue).toContain("923403318127");
    expect(methods.find((item) => item.id === "BINANCE_USDT")?.copyValue).toBe(
      "0x039a8c041809cdf0192ced7d904df1353913b53a",
    );
    expect(methods.find((item) => item.id === "BINANCE_USDT")?.network).toBe("BSC");
    expect(revenueCatConfigured()).toBe(false);
    expect(methods.find((item) => item.id === "REVENUECAT")?.available).toBe(false);
    expect(methods.find((item) => item.id === "REVENUECAT")?.unavailableReason).toMatch(/not configured/i);
  });

  it("keeps packages inactive until admin approval", () => {
    expect(paymentIsActivated("PENDING_PAYMENT")).toBe(false);
    expect(paymentIsActivated("UNDER_REVIEW")).toBe(false);
    expect(paymentIsActivated("REJECTED")).toBe(false);
    expect(paymentIsActivated("APPROVED")).toBe(true);
    expect(paymentIsActivated("PAID")).toBe(true);
    expect(paymentCanSubmitProof("PENDING_PAYMENT")).toBe(true);
    expect(paymentCanSubmitProof("UNDER_REVIEW")).toBe(false);
    expect(paymentCanSubmitProof("REJECTED")).toBe(true);
    expect(PAYMENT_STATUS_LABELS.UNDER_REVIEW).toMatch(/under review/i);
  });

  it("rejects oversized or disallowed payment proofs", () => {
    expect(validatePaymentProof({ type: "image/png", size: 1200 }).ok).toBe(true);
    expect(validatePaymentProof({ type: "application/pdf", size: 80 }).ok).toBe(true);
    expect(validatePaymentProof({ type: "text/plain", size: 80 }).ok).toBe(false);
    expect(validatePaymentProof({ type: "image/png", size: 3 * 1024 * 1024 }).ok).toBe(false);
  });

  it("notifies admin and developer with payment details, not secrets", () => {
    const admin = adminPaymentReviewEmail({
      developerName: "Ayesha",
      developerEmail: "dev@example.com",
      packageName: "20 testers",
      testerCount: 20,
      amountLabel: "PKR 11,500",
      methodLabel: "EasyPaisa",
      transactionReference: "TL-MBT-ABC",
      developerReference: "TID-9",
      submittedAt: "2026-08-29T00:00:00.000Z",
      reviewUrl: "https://www.testloop.org/admin/managed-testing/payments/pay_1",
      statusLabel: "Payment under review",
      hasProof: true,
    });
    expect(admin.subject).toContain("dev@example.com");
    expect(admin.text).toContain("EasyPaisa");
    expect(admin.text).toContain("TID-9");
    expect(admin.text).not.toMatch(/REVENUECAT_SECRET/);
    const approved = developerPaymentApprovedEmail({
      packageName: "20 testers",
      testerCount: 20,
      amountLabel: "PKR 11,500",
      setupUrl: "https://www.testloop.org/managed-testing/mtc_1/setup",
    });
    expect(approved.subject).toMatch(/approved/i);
    const rejected = developerPaymentRejectedEmail({
      packageName: "20 testers",
      amountLabel: "PKR 11,500",
      note: "Screenshot does not show the transfer.",
      retryUrl: "https://www.testloop.org/managed-testing/payments/pay_1",
    });
    expect(rejected.text).toContain("Screenshot does not show the transfer.");
  });
});

