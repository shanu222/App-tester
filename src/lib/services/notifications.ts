import { prisma } from "@/lib/db";
import { AppError, RateLimitError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/crypto";
import { env, smtpConfigured } from "@/lib/env";
import { describeEmail } from "@/lib/email-extract";
import { sendSmtpEmail } from "@/lib/smtp";
import { notify } from "@/lib/audit";
import { testingTypeLabel } from "@/lib/campaign-autofill";
import { PLAY_CONSOLE_URL } from "@/lib/integrations/play-testers";
import {
  karachiDayKey,
  parseNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import {
  dailySummaryEmail,
  playIssueEmail,
  testerJoinedEmail,
  testNotificationEmail,
  verificationEmail,
} from "@/lib/notifications/templates";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function omitNotificationSecrets<T extends { notificationEmailVerificationTokenHash?: unknown }>(
  settings: T,
) {
  const rest = { ...settings };
  delete rest.notificationEmailVerificationTokenHash;
  return rest;
}

export function publicNotificationSettings(settings: {
  notificationEmail: string | null;
  notificationEmailVerified: boolean;
  pendingNotificationEmail: string | null;
  emailNotificationsEnabled: boolean;
  notificationPreferences: unknown;
  lastNotificationSentAt: Date | null;
  lastDailySummaryOn: Date | null;
  lastDailySummaryStatus: string | null;
}) {
  const prefs = parseNotificationPreferences(settings.notificationPreferences);
  return {
    notificationEmail: settings.notificationEmail,
    verified: Boolean(settings.notificationEmail && settings.notificationEmailVerified),
    pendingEmail: settings.pendingNotificationEmail,
    enabled: settings.emailNotificationsEnabled !== false,
    lastNotificationSentAt: settings.lastNotificationSentAt?.toISOString() ?? null,
    lastDailySummaryOn: settings.lastDailySummaryOn?.toISOString() ?? null,
    lastDailySummaryStatus: settings.lastDailySummaryStatus,
    smtpConfigured: smtpConfigured(),
    preferences: prefs,
  };
}

export async function getNotificationSettings(userId: string) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const recent = await prisma.emailEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      type: true,
      toAddress: true,
      status: true,
      createdAt: true,
      subject: true,
    },
  });
  return {
    ...publicNotificationSettings(settings),
    recent: recent.map((row) => ({
      id: row.id,
      type: row.type,
      to: row.toAddress,
      status: row.status,
      subject: row.subject,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

async function recentEmailCount(userId: string, type: string, hours: number) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return prisma.emailEvent.count({
    where: { userId, type, createdAt: { gte: since } },
  });
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export async function requestNotificationEmail(userId: string, email: string) {
  const described = describeEmail(email);
  if (!described.valid) throw new AppError("Enter a valid email address.");
  const current = await prisma.userSettings.findUnique({ where: { userId } });
  if (
    current?.notificationEmailVerified &&
    current.notificationEmail === described.normalized
  ) {
    if (current.pendingNotificationEmail) {
      await prisma.userSettings.update({
        where: { userId },
        data: {
          pendingNotificationEmail: null,
          notificationEmailVerificationTokenHash: null,
          notificationEmailVerificationExpiresAt: null,
        },
      });
    }
    return { pendingEmail: null as string | null, alreadyVerified: true as const };
  }
  if ((await recentEmailCount(userId, "verification", 1)) >= 5) {
    throw new RateLimitError("Too many verification emails. Try again later.");
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  await prisma.userSettings.upsert({
    where: { userId },
    update: {
      pendingNotificationEmail: described.normalized,
      notificationEmailVerificationTokenHash: sha256(token),
      notificationEmailVerificationExpiresAt: expiresAt,
    },
    create: {
      userId,
      pendingNotificationEmail: described.normalized,
      notificationEmailVerificationTokenHash: sha256(token),
      notificationEmailVerificationExpiresAt: expiresAt,
    },
  });

  const template = verificationEmail(token);
  const sent = await sendSmtpEmail({
    to: described.normalized,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
  await prisma.emailEvent.create({
    data: {
      userId,
      type: "verification",
      toAddress: described.normalized,
      subject: template.subject,
      status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
      error: sent.ok ? null : sent.error,
    },
  });
  if (!sent.ok) {
    throw new AppError(sent.error);
  }
  return { pendingEmail: described.normalized };
}

export async function resendNotificationVerification(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const pending = settings?.pendingNotificationEmail;
  if (!pending) throw new AppError("There is no notification email waiting to be verified.");
  return requestNotificationEmail(userId, pending);
}

export async function verifyNotificationEmailToken(token: string) {
  const hash = sha256(token.trim());
  const settings = await prisma.userSettings.findFirst({
    where: {
      notificationEmailVerificationTokenHash: hash,
      notificationEmailVerificationExpiresAt: { gt: new Date() },
    },
  });
  if (!settings?.pendingNotificationEmail) {
    throw new AppError("This verification link is invalid or has expired.");
  }
  await prisma.userSettings.update({
    where: { id: settings.id },
    data: {
      notificationEmail: settings.pendingNotificationEmail,
      notificationEmailVerified: true,
      pendingNotificationEmail: null,
      notificationEmailVerificationTokenHash: null,
      notificationEmailVerificationExpiresAt: null,
    },
  });
  return { email: settings.pendingNotificationEmail };
}

export async function saveNotificationPreferences(
  userId: string,
  input: { enabled?: boolean; preferences?: Partial<NotificationPreferences> },
) {
  const current = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const merged = {
    ...parseNotificationPreferences(current.notificationPreferences),
    ...(input.preferences || {}),
  };
  return prisma.userSettings.update({
    where: { userId },
    data: {
      emailNotificationsEnabled: input.enabled ?? current.emailNotificationsEnabled,
      notificationPreferences: merged,
    },
  });
}

export async function sendTestNotificationEmail(userId: string) {
  if ((await recentEmailCount(userId, "test_email", 1)) >= 3) {
    throw new RateLimitError("Too many test emails. Try again later.");
  }
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.notificationEmail || !settings.notificationEmailVerified) {
    throw new AppError("Verify a notification email before sending a test.");
  }
  const template = testNotificationEmail();
  const sent = await sendSmtpEmail({
    to: settings.notificationEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
  await prisma.emailEvent.create({
    data: {
      userId,
      type: "test_email",
      toAddress: settings.notificationEmail,
      subject: template.subject,
      status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
      error: sent.ok ? null : sent.error,
    },
  });
  if (sent.ok) {
    await prisma.userSettings.update({
      where: { userId },
      data: { lastNotificationSentAt: new Date() },
    });
  }
  if (!sent.ok) throw new AppError(sent.error);
  return { ok: true as const };
}

function preferenceEnabled(prefs: NotificationPreferences, key: NotificationPreferenceKey) {
  if (key === "testerJoined") return prefs.testerJoined || prefs.testerAccepted;
  if (key === "testerActionRequired") {
    return prefs.testerActionRequired || prefs.playActionRequired || prefs.testerJoined || prefs.testerAccepted;
  }
  return prefs[key];
}

export async function sendDeveloperNotification(input: {
  userId: string;
  type: string;
  eventKey: string;
  preference: NotificationPreferenceKey;
  subject: string;
  text: string;
  html: string;
  campaignId?: string;
  testerId?: string;
  inApp?: { title: string; body: string; href?: string };
}) {
  if (input.inApp) {
    await notify({
      userId: input.userId,
      type: input.type.startsWith("play") ? "integration" : "tester",
      title: input.inApp.title,
      body: input.inApp.body,
      href: input.inApp.href,
      campaignId: input.campaignId,
    });
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId: input.userId } });
  const prefs = parseNotificationPreferences(settings?.notificationPreferences);
  const allowed =
    settings?.emailNotificationsEnabled !== false && preferenceEnabled(prefs, input.preference);
  const to = settings?.notificationEmailVerified ? settings.notificationEmail || "" : "";
  const status = !allowed ? "disabled" : !to ? "skipped" : "queued";

  try {
    await prisma.emailEvent.create({
      data: {
        userId: input.userId,
        campaignId: input.campaignId,
        testerId: input.testerId,
        type: input.type,
        toAddress: to,
        subject: input.subject,
        status,
        error: status === "skipped" ? "No verified notification email." : null,
        eventKey: input.eventKey,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "sent", duplicate: true as const };
    }
    throw error;
  }

  if (status !== "queued") return { status, duplicate: false as const };

  const sent = await sendSmtpEmail({
    to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  await prisma.emailEvent.update({
    where: { eventKey: input.eventKey },
    data: {
      status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
      error: sent.ok ? null : sent.error,
    },
  });
  if (sent.ok) {
    await prisma.userSettings.update({
      where: { userId: input.userId },
      data: { lastNotificationSentAt: new Date() },
    });
  }
  return { status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed", duplicate: false as const };
}

export async function notifyTesterJoined(input: {
  ownerUserId: string;
  campaignId: string;
  testerKey: string;
  testerId?: string;
  appName: string;
  testingType: "OPEN" | "CLOSED" | "INTERNAL";
  trackLabel: string;
  testerStatus: string;
  testerCount: number;
  targetTesters: number;
  actionRequired: string | null;
  joinKind: "open" | "google_group" | "individual";
}) {
  const campaignUrl = `${env.appUrl.replace(/\/$/, "")}/campaigns/${input.campaignId}`;
  const template = testerJoinedEmail({
    appName: input.appName,
    testingTypeLabel: testingTypeLabel(input.testingType),
    trackLabel: input.trackLabel,
    testerStatus: input.testerStatus,
    testerCount: input.testerCount,
    targetTesters: input.targetTesters,
    actionRequired: input.actionRequired,
    campaignUrl,
    playConsoleUrl: input.actionRequired ? PLAY_CONSOLE_URL : null,
  });
  const preference: NotificationPreferenceKey = input.actionRequired
    ? "testerActionRequired"
    : "testerJoined";
  await sendDeveloperNotification({
    userId: input.ownerUserId,
    type: input.actionRequired ? "tester_action_required" : "tester_joined",
    eventKey: `tester_joined:${input.campaignId}:${input.testerKey}`,
    preference,
    subject: template.subject,
    text: template.text,
    html: template.html,
    campaignId: input.campaignId,
    testerId: input.testerId,
    inApp: {
      title: input.actionRequired ? "New tester request" : "New tester joined your TestLoop testing request",
      body: `${input.appName} · ${testingTypeLabel(input.testingType)} · ${input.testerStatus}`,
      href: `/campaigns/${input.campaignId}`,
    },
  });
}

export async function notifyPlaySyncIssue(userId: string, appName?: string | null) {
  const day = karachiDayKey();
  const template = playIssueEmail({
    title: "Google Play synchronization issue",
    body: appName
      ? `TestLoop could not refresh ${appName} from Google Play. Connect Google Play if needed, then try Refresh from Google Play.`
      : "TestLoop could not refresh Google Play. Connect Google Play if needed, then try Refresh from Google Play.",
    href: `${env.appUrl.replace(/\/$/, "")}/play`,
  });
  await sendDeveloperNotification({
    userId,
    type: "play_sync_issue",
    eventKey: `play_sync:${userId}:${day}`,
    preference: "playSyncIssues",
    subject: template.subject,
    text: template.text,
    html: template.html,
    inApp: {
      title: "Google Play synchronization issue",
      body: "TestLoop could not refresh Google Play.",
      href: "/play",
    },
  });
}

export async function notifyPlayTrackChange(userId: string, appId: string, appName: string) {
  const day = karachiDayKey();
  const template = playIssueEmail({
    title: "Google Play track status changed",
    body: `Google Play reported a testing-track change for ${appName}. TestLoop recorded the Play snapshot and did not change Google Play.`,
    href: `${env.appUrl.replace(/\/$/, "")}/play`,
  });
  await sendDeveloperNotification({
    userId,
    type: "play_track_change",
    eventKey: `play_track:${appId}:${day}`,
    preference: "playTrackChanges",
    subject: template.subject,
    text: template.text,
    html: template.html,
    inApp: {
      title: "Google Play track status changed",
      body: `${appName} · review the latest Play configuration in TestLoop.`,
      href: "/play",
    },
  });
}

export async function notifyTesterOnboardingIssue(input: {
  userId: string;
  campaignId: string;
  testerKey: string;
  appName: string;
}) {
  const template = playIssueEmail({
    title: "Tester onboarding issue",
    body: `TestLoop could not complete onboarding for a tester on ${input.appName}. Google Play access was not claimed as successful.`,
    href: `${env.appUrl.replace(/\/$/, "")}/campaigns/${input.campaignId}`,
  });
  await sendDeveloperNotification({
    userId: input.userId,
    type: "tester_onboarding_issue",
    eventKey: `tester_issue:${input.campaignId}:${input.testerKey}`,
    preference: "testerOnboardingIssue",
    subject: template.subject,
    text: template.text,
    html: template.html,
    campaignId: input.campaignId,
    inApp: {
      title: "Tester onboarding issue",
      body: `A tester could not complete onboarding for ${input.appName}.`,
      href: `/campaigns/${input.campaignId}`,
    },
  });
}

export async function notifyRequestLifecycle(input: {
  userId: string;
  campaignId: string;
  appName: string;
  kind: "archived" | "completed";
}) {
  const preference: NotificationPreferenceKey =
    input.kind === "archived" ? "requestArchived" : "requestCompleted";
  const title =
    input.kind === "archived" ? "Testing request archived" : "Testing request completed";
  const template = playIssueEmail({
    title,
    body: `${input.appName} was ${input.kind} in TestLoop. Google Play was not changed.`,
    href: `${env.appUrl.replace(/\/$/, "")}/campaigns/${input.campaignId}`,
  });
  await sendDeveloperNotification({
    userId: input.userId,
    type: `request_${input.kind}`,
    eventKey: `request_${input.kind}:${input.campaignId}`,
    preference,
    subject: template.subject,
    text: template.text,
    html: template.html,
    campaignId: input.campaignId,
  });
}

function startOfKarachiDay(date = new Date()) {
  const day = karachiDayKey(date);
  return new Date(`${day}T00:00:00+05:00`);
}

export async function sendDailySummaries() {
  const day = karachiDayKey();
  const since = startOfKarachiDay();
  const settingsRows = await prisma.userSettings.findMany({
    where: {
      notificationEmailVerified: true,
      notificationEmail: { not: null },
    },
    include: { user: { select: { id: true, deletedAt: true } } },
  });

  const results = { sent: 0, failed: 0, skipped: 0, disabled: 0 };
  for (const settings of settingsRows) {
    if (settings.user.deletedAt) continue;
    const prefs = parseNotificationPreferences(settings.notificationPreferences);
    const eventKey = `daily_summary:${settings.userId}:${day}`;
    const existing = await prisma.emailEvent.findUnique({ where: { eventKey } });
    if (existing) {
      results.skipped += 1;
      continue;
    }
    if (!prefs.dailySummary || settings.emailNotificationsEnabled === false) {
      try {
        await prisma.emailEvent.create({
          data: {
            userId: settings.userId,
            type: "daily_summary",
            toAddress: settings.notificationEmail || "",
            subject: "Daily summary",
            status: "disabled",
            eventKey,
          },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        results.skipped += 1;
        continue;
      }
      results.disabled += 1;
      await prisma.userSettings.update({
        where: { userId: settings.userId },
        data: { lastDailySummaryOn: since, lastDailySummaryStatus: "disabled" },
      });
      continue;
    }

    const [active, createdToday, archivedToday, testersToday, pending, play, appCounts] = await Promise.all([
      prisma.campaign.count({
        where: { userId: settings.userId, published: true, status: "ACTIVE" },
      }),
      prisma.campaign.count({
        where: { userId: settings.userId, createdAt: { gte: since } },
      }),
      prisma.campaign.count({
        where: { userId: settings.userId, status: "ARCHIVED", updatedAt: { gte: since } },
      }),
      prisma.testingParticipation.count({
        where: { ownerUserId: settings.userId, createdAt: { gte: since } },
      }),
      prisma.testingParticipation.count({
        where: { ownerUserId: settings.userId, status: "MANUAL_REQUIRED" },
      }),
      prisma.googlePlayConnection.findUnique({
        where: { userId: settings.userId },
        select: { status: true, lastError: true, lastSyncAt: true },
      }),
      prisma.campaign.findMany({
        where: { userId: settings.userId, published: true, status: "ACTIVE" },
        select: {
          app: { select: { name: true } },
          _count: { select: { participations: true } },
        },
        take: 6,
      }),
    ]);
    const byType = await prisma.campaign.groupBy({
      by: ["testingType"],
      where: { userId: settings.userId, published: true, status: "ACTIVE" },
      _count: { _all: true },
    });
    const typeCount = (type: "OPEN" | "CLOSED" | "INTERNAL") =>
      byType.find((row) => row.testingType === type)?._count._all || 0;

    const playLine =
      play?.status !== "CONNECTED"
        ? "Google Play connection required"
        : play.lastError
          ? "Synchronization problems"
          : play.lastSyncAt
            ? "Successfully synchronized"
            : "Connected";

    const attention: string[] = [];
    if (pending) attention.push(`${pending} tester(s) waiting for Play Console action`);
    if (play?.status !== "CONNECTED") attention.push("Google Play connection required");
    else if (play.lastError) attention.push("Google Play could not be refreshed");

    const testerByApp = appCounts
      .map((row) => `${row.app.name}: ${row._count.participations}`)
      .join("; ");

    try {
      await prisma.emailEvent.create({
        data: {
          userId: settings.userId,
          type: "daily_summary",
          toAddress: settings.notificationEmail!,
          subject: `TestLoop daily summary — ${day}`,
          status: "queued",
          eventKey,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        results.skipped += 1;
        continue;
      }
      throw error;
    }

    const template = dailySummaryEmail({
      dateLabel: day,
      lines: [
        `Testing requests: ${active} active, ${createdToday} new, ${archivedToday} archived`,
        `Tester activity: ${testersToday} new today, ${pending} pending${testerByApp ? `; ${testerByApp}` : ""}`,
        `Testing status: ${typeCount("OPEN")} open, ${typeCount("CLOSED")} closed, ${typeCount("INTERNAL")} internal`,
        `Google Play: ${playLine}`,
      ],
      attention,
      dashboardUrl: `${env.appUrl.replace(/\/$/, "")}/dashboard`,
    });

    const sent = await sendSmtpEmail({
      to: settings.notificationEmail!,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    const status = sent.ok ? "sent" : sent.skipped ? "skipped" : "failed";
    await prisma.emailEvent.update({
      where: { eventKey },
      data: {
        subject: template.subject,
        status,
        error: sent.ok ? null : sent.error,
      },
    });
    await prisma.userSettings.update({
      where: { userId: settings.userId },
      data: {
        lastDailySummaryOn: since,
        lastDailySummaryStatus: status,
        lastNotificationSentAt: sent.ok ? new Date() : settings.lastNotificationSentAt,
      },
    });
    if (sent.ok) results.sent += 1;
    else if (sent.skipped) results.skipped += 1;
    else results.failed += 1;
  }
  return results;
}

export { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/preferences";
