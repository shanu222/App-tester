import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  karachiDayKey,
  parseNotificationPreferences,
} from "../src/lib/notifications/preferences";
import {
  digestEventKey,
  isScheduledSendDue,
  parseNotificationSchedule,
  parseNotificationTime,
  resolveTimeZone,
} from "../src/lib/notifications/schedule";
import {
  dailySummaryEmail,
  testerApprovedEmail,
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
    expect(DEFAULT_NOTIFICATION_PREFERENCES.testerConfirmed).toBe(true);
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

describe("notification schedule", () => {
  const karachiFourPm = new Date("2026-08-28T11:00:00.000Z");

  it("defaults to daily at 16:00 Asia/Karachi", () => {
    expect(parseNotificationSchedule({})).toEqual({
      frequency: "daily",
      time: "16:00",
      timezone: "Asia/Karachi",
      weekday: 1,
    });
  });

  it("treats the default Karachi time as due at 11:00 UTC", () => {
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "daily",
        time: "16:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(true);
    expect(
      isScheduledSendDue(new Date("2026-08-28T10:59:00.000Z"), {
        frequency: "daily",
        time: "16:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(false);
    expect(
      isScheduledSendDue(new Date("2026-08-28T11:15:00.000Z"), {
        frequency: "daily",
        time: "16:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(true);
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "daily",
        time: "09:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(true);
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "daily",
        time: "20:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(false);
  });

  it("sends weekly mail only on the selected weekday", () => {
    const weeklyFriday = {
      frequency: "weekly" as const,
      time: "16:00",
      timezone: "Asia/Karachi",
      weekday: 5,
    };
    const weeklyMonday = { ...weeklyFriday, weekday: 1 };
    expect(isScheduledSendDue(karachiFourPm, weeklyFriday)).toBe(true);
    expect(isScheduledSendDue(karachiFourPm, weeklyMonday)).toBe(false);
  });

  it("falls back to Asia/Karachi for invalid timezones", () => {
    expect(resolveTimeZone("Not/AZone")).toBe("Asia/Karachi");
    expect(parseNotificationTime("16:00:00")).toBe("16:00");
    expect(parseNotificationTime("25:99")).toBe("16:00");
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "daily",
        time: "16:00",
        timezone: "Not/AZone",
        weekday: 1,
      }),
    ).toBe(true);
  });

  it("does not treat realtime or disabled as scheduled sends", () => {
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "realtime",
        time: "16:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(false);
    expect(
      isScheduledSendDue(karachiFourPm, {
        frequency: "disabled",
        time: "16:00",
        timezone: "Asia/Karachi",
        weekday: 1,
      }),
    ).toBe(false);
  });

  it("builds timezone-local digest keys", () => {
    expect(digestEventKey("user-1", parseNotificationSchedule({}), karachiFourPm)).toBe(
      "digest:daily:user-1:2026-08-28",
    );
    expect(
      digestEventKey(
        "user-1",
        parseNotificationSchedule({
          notificationFrequency: "weekly",
          notificationWeekday: 5,
        }),
        karachiFourPm,
      ),
    ).toBe("digest:weekly:user-1:2026-08-28");
  });
});

describe("email templates", () => {
  it("does not include package names, IDs, or service-account details", () => {
    const email = testerJoinedEmail({
      appName: "AI Phone Doctor",
      testingTypeLabel: "Closed Testing",
      testerName: "Developer B",
      testerEmail: "testerb@gmail.com",
      requestedAt: new Date("2026-08-28T11:00:00.000Z"),
      testerStatus: "Waiting for Developer",
      campaignUrl: "https://www.testloop.org/campaigns/public-campaign",
      playConsoleUrl: "https://play.google.com/console",
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(email.subject).toBe("New Tester Request — AI Phone Doctor");
    expect(blob).toContain("Open TestLoop");
    expect(blob).toContain("Open Google Play Console");
    expect(blob).toContain("testerb@gmail.com");
    expect(blob).toContain("Waiting for Developer");
    expect(blob).toContain("Add the tester using the email address below");
    expect(blob).not.toMatch(/com\.[a-z0-9]+/i);
    expect(blob).not.toMatch(/service.?account/i);
    expect(blob).not.toMatch(/SMTP_/i);
    expect(blob).not.toMatch(/CRON_SECRET/);
    expect(blob).not.toContain("tester_joined:");
  });

  it("tells the tester they were added without claiming a Play API write", () => {
    const email = testerApprovedEmail({
      appName: "AI Phone Doctor",
      testingTypeLabel: "Closed",
      durationDays: 14,
      developerName: "Developer A",
      testingUrl: "https://play.google.com/apps/testing/example",
      groupJoinUrl: "https://groups.google.com/g/example",
      dashboardUrl: "https://www.testloop.org/testing",
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(email.subject).toBe("You're Added as a Tester — AI Phone Doctor");
    expect(blob).toContain("Open Google Play Testing");
    expect(blob).toContain("Join Google Group");
    expect(blob).toContain("14 days");
    expect(blob).not.toMatch(/com\.[a-z0-9]+/i);
    expect(blob).not.toMatch(/service.?account/i);
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
    expect(publicView.frequency).toBe("daily");
    expect(publicView.time).toBe("16:00");
    expect(publicView.timezone).toBe("Asia/Karachi");
    expect(publicView.weekday).toBe(1);

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
