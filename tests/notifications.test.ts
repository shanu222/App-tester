import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  karachiDayKey,
  parseNotificationPreferences,
} from "../src/lib/notifications/preferences";
import {
  dailySummaryEmail,
  testerJoinedEmail,
  testNotificationEmail,
  verificationEmail,
} from "../src/lib/notifications/templates";
import { omitNotificationSecrets, publicNotificationSettings } from "../src/lib/services/notifications";
import { smtpConfigured } from "../src/lib/env";
import { sendSmtpEmail } from "../src/lib/smtp";

describe("notification preferences", () => {
  it("enables important alerts by default", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.testerJoined).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.testerActionRequired).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.playSyncIssues).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.playActionRequired).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.dailySummary).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.playTrackChanges).toBe(false);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.requestArchived).toBe(false);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.requestCompleted).toBe(false);
  });

  it("fills missing keys from defaults without treating unknown JSON as enabled", () => {
    const parsed = parseNotificationPreferences({ testerJoined: false, extra: true });
    expect(parsed.testerJoined).toBe(false);
    expect(parsed.dailySummary).toBe(true);
    expect(parsed).not.toHaveProperty("extra");
  });
});

describe("karachiDayKey", () => {
  it("uses Asia/Karachi calendar dates", () => {
    expect(karachiDayKey(new Date("2026-08-28T11:00:00.000Z"))).toBe("2026-08-28");
    expect(karachiDayKey(new Date("2026-08-28T19:00:00.000Z"))).toBe("2026-08-29");
  });
});

describe("email templates", () => {
  it("does not include package names, IDs, or service-account details", () => {
    const email = testerJoinedEmail({
      appName: "AI Phone Doctor",
      testingTypeLabel: "Closed Testing",
      trackLabel: "Closed testing",
      testerStatus: "Waiting for developer",
      testerCount: 3,
      targetTesters: 12,
      actionRequired: "Add this tester in Google Play Console. TestLoop cannot add individual Gmail addresses through the Play API.",
      campaignUrl: "https://www.testloop.org/campaigns/public-campaign",
      playConsoleUrl: "https://play.google.com/console",
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(email.subject).toBe("New tester joined — AI Phone Doctor");
    expect(blob).toContain("View Testing Request");
    expect(blob).toContain("Manage in Google Play");
    expect(blob).not.toMatch(/com\.[a-z0-9]+/i);
    expect(blob).not.toMatch(/service.?account/i);
    expect(blob).not.toMatch(/SMTP_/i);
    expect(blob).not.toMatch(/CRON_SECRET/);
    expect(blob).not.toContain("tester_joined:");
  });

  it("keeps verification and test copy professional", () => {
    const verify = verificationEmail("token-value");
    expect(verify.subject).toBe("Verify your TestLoop notification email");
    expect(verify.text).toContain("You requested to receive TestLoop notifications at this email address.");
    expect(verify.html).toContain("Verify Email");
    expect(verify.html).toContain("/notifications/verify?token=");
    const test = testNotificationEmail();
    expect(test.subject).toBe("TestLoop Notification Test");
    expect(test.text).toContain("Your TestLoop email notifications are working correctly.");
    const summary = dailySummaryEmail({
      dateLabel: "2026-08-28",
      lines: ["Testing requests: 1 active"],
      attention: ["Google Play connection required"],
      dashboardUrl: "https://www.testloop.org/dashboard",
    });
    expect(summary.text).toContain("TESTLOOP DAILY SUMMARY");
    expect(summary.html).toContain("View in TestLoop");
  });
});

describe("settings sanitization", () => {
  it("never returns the verification token hash", () => {
    const publicView = publicNotificationSettings({
      notificationEmail: "developer@example.com",
      notificationEmailVerified: true,
      pendingNotificationEmail: null,
      emailNotificationsEnabled: true,
      notificationPreferences: null,
      lastNotificationSentAt: null,
      lastDailySummaryOn: null,
      lastDailySummaryStatus: "sent",
    });
    expect(JSON.stringify(publicView)).not.toMatch(/token/i);
    expect(publicView).not.toHaveProperty("notificationEmailVerificationTokenHash");

    const stripped = omitNotificationSecrets({
      notificationEmail: "developer@example.com",
      notificationEmailVerificationTokenHash: "abc123secret",
      pendingNotificationEmail: "other@example.com",
    });
    expect(stripped).not.toHaveProperty("notificationEmailVerificationTokenHash");
    expect(JSON.stringify(stripped)).not.toContain("abc123secret");
  });
});

describe("smtp sender", () => {
  it("does not expose credentials when SMTP is missing", async () => {
    if (smtpConfigured()) return;
    const result = await sendSmtpEmail({
      to: "developer@example.com",
      subject: "Test",
      text: "Hello",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).not.toContain("password");
      expect(result.error).not.toMatch(/SMTP_/);
      expect(result.error).not.toContain("CRON_SECRET");
    }
  });
});
