import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { env, smtpConfigured } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendSmtpEmail } from "@/lib/smtp";
import { logActivity } from "@/lib/audit";
import { karachiDayKey, parseNotificationPreferences } from "@/lib/notifications/preferences";
import {
  developerMarketplaceAcceptedEmail,
  developerMarketplaceDownloadOpenedEmail,
  marketplaceTestingInviteEmail,
} from "@/lib/notifications/templates";
import { campaignTestingUrl } from "@/lib/integrations/play-testers";
import { testingTypeLabel } from "@/lib/campaign-autofill";
import { allocateCampaignSlug } from "@/lib/services/campaigns";
import { sendDeveloperNotification } from "@/lib/services/notifications";
import { issueMarketplaceActionToken, verifyMarketplaceActionToken } from "@/lib/testing/email-action-token";
import {
  MARKETPLACE_DURATION_DAYS,
  MARKETPLACE_EMAIL_ACTION_KIND,
  MARKETPLACE_INVITE_DAY_KEY,
  MARKETPLACE_INVITE_TYPE,
  MARKETPLACE_REMINDER_TYPE,
  campaignIsLive,
  isPaidOperationTesterEmail,
  isSafePlayRedirect,
  marketplaceEndsAt,
  marketplaceInviteAllowed,
  marketplaceParticipationActed,
  marketplaceReminderAllowed,
} from "@/lib/testing/marketplace-rules";

function origin() {
  return env.appUrl.replace(/\/$/, "");
}

function campaignUrl(id: string) {
  return `${origin()}/campaigns/${id}`;
}

function acceptActionUrl(token: string) {
  return `${origin()}/api/testing/email-action/accept?t=${encodeURIComponent(token)}`;
}

function uniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002");
}

export async function loadPaidOperationTesterEmails() {
  const [pool, testers] = await Promise.all([
    prisma.managedFixedPoolEmail.findMany({ select: { email: true } }),
    prisma.managedTester.findMany({
      where: { OR: [{ reservedPackageCode: { not: null } }, { currentlyAssigned: true }] },
      select: { email: true, googleAccountEmail: true },
    }),
  ]);
  const emails = new Set<string>();
  for (const row of pool) emails.add(row.email.trim().toLowerCase());
  for (const row of testers) {
    emails.add(row.email.trim().toLowerCase());
    if (row.googleAccountEmail) emails.add(row.googleAccountEmail.trim().toLowerCase());
  }
  return emails;
}

function destinationPlayUrl(input: {
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  packageName?: string | null;
  testingUrl?: string | null;
  webOptInUrl?: string | null;
  playStoreUrl?: string | null;
}) {
  const testing = campaignTestingUrl({
    testingType: input.testingType,
    packageName: input.packageName,
    configuredUrl: input.testingUrl || input.webOptInUrl,
  });
  if (testing.url && isSafePlayRedirect(testing.url)) return testing.url;
  if (input.testingType !== "INTERNAL" && input.playStoreUrl && isSafePlayRedirect(input.playStoreUrl)) {
    return input.playStoreUrl;
  }
  return testing.url || null;
}

export async function ensureMarketplaceCampaignForApp(appId: string) {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: { user: { select: { developerName: true, name: true, company: true } } },
  });
  if (!app) throw new NotFoundError("App not found.");
  if (app.isDemo) return { skipped: "demo" as const, campaign: null };

  const existing = await prisma.campaign.findFirst({
    where: { appId: app.id, published: true, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (existing && campaignIsLive(existing)) {
    return { skipped: "already-active" as const, campaign: existing, created: false as const };
  }

  const playUrl = destinationPlayUrl({
    testingType: app.testingType,
    packageName: app.packageName,
    webOptInUrl: app.webOptInUrl,
    playStoreUrl: app.playStoreUrl,
  });
  if (!playUrl) {
    return { skipped: "missing-testing-url" as const, campaign: null };
  }

  const now = new Date();
  const publicSlug = await allocateCampaignSlug(app.name);
  const campaign = await prisma.campaign.create({
    data: {
      userId: app.userId,
      appId: app.id,
      name: `${app.name} — TestLoop testing`,
      status: "ACTIVE",
      published: true,
      publishedAt: now,
      startedAt: now,
      endsAt: marketplaceEndsAt(now, MARKETPLACE_DURATION_DAYS),
      durationDays: MARKETPLACE_DURATION_DAYS,
      requiredActiveDays: MARKETPLACE_DURATION_DAYS,
      testingType: app.testingType,
      testingUrl: playUrl,
      playStoreUrl: app.playStoreUrl,
      webOptInUrl: app.webOptInUrl,
      publicSlug,
      targetTesters: app.testerTarget || 12,
      requiredTesters: app.testerTarget || 12,
      isDemo: false,
    },
  });
  await logActivity({ userId: app.userId, campaignId: campaign.id, action: "MARKETPLACE_CAMPAIGN_CREATED", result: app.name });
  await notifyMarketplaceCampaignPublished(campaign.id);
  return { skipped: null, campaign, created: true as const };
}

async function afterPublishedSafe(campaignId: string, userId: string) {
  try {
    await notifyMarketplaceCampaignPublished(campaignId);
  } catch {
    await logActivity({ userId, campaignId, action: "MARKETPLACE_NOTIFY_FAILED", result: campaignId }).catch(() => undefined);
  }
}

export async function onCampaignPublished(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.isDemo || !campaign.published) return campaign;
  const now = new Date();
  const startedAt = campaign.startedAt ?? now;
  const endsAt = campaign.endsAt ?? marketplaceEndsAt(startedAt, campaign.durationDays || MARKETPLACE_DURATION_DAYS);
  if (!campaign.startedAt || !campaign.endsAt || campaign.status === "DRAFT" || campaign.status === "PAUSED") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: campaign.status === "ARCHIVED" || campaign.status === "COMPLETED" || campaign.status === "EXPIRED" ? campaign.status : "ACTIVE",
        startedAt,
        endsAt,
        durationDays: campaign.durationDays || MARKETPLACE_DURATION_DAYS,
      },
    });
  }
  await afterPublishedSafe(campaignId, campaign.userId);
  return campaign;
}

export async function notifyMarketplaceCampaignPublished(campaignId: string, sendLimit = 20) {
  await queueMarketplaceInvites(campaignId);
  return sendQueuedMarketplaceEmails({ campaignId, type: MARKETPLACE_INVITE_TYPE, limit: sendLimit });
}

export async function queueMarketplaceInvites(campaignId: string) {
  const campaign = await loadLiveCampaign(campaignId);
  if (!campaign) return { queued: 0 };
  const paid = await loadPaidOperationTesterEmails();
  const users = await prisma.user.findMany({
    where: { deletedAt: null, suspendedAt: null, demoMode: false, id: { not: campaign.userId } },
    select: {
      id: true,
      email: true,
      settings: { select: { emailNotificationsEnabled: true, notificationPreferences: true, notificationFrequency: true } },
    },
  });
  const participations = await prisma.testingParticipation.findMany({
    where: { campaignId, testerUserId: { in: users.map((user) => user.id) } },
    select: { testerUserId: true, acceptedAt: true, downloadLinkClickedAt: true, consentAt: true, status: true },
  });
  const byTester = new Map(participations.map((row) => [row.testerUserId, row]));
  const existing = await prisma.campaignNotificationDelivery.findMany({
    where: { campaignId, type: MARKETPLACE_INVITE_TYPE, dayKey: MARKETPLACE_INVITE_DAY_KEY },
    select: { recipientUserId: true },
  });
  const invited = new Set(existing.map((row) => row.recipientUserId));
  let queued = 0;
  for (const user of users) {
    const prefs = parseNotificationPreferences(user.settings?.notificationPreferences);
    const optedOut = user.settings?.emailNotificationsEnabled === false || user.settings?.notificationFrequency === "disabled" || prefs.testingMarketplace === false;
    const allowed = marketplaceInviteAllowed({
      campaignLive: true,
      isOwner: false,
      paidOperationTester: isPaidOperationTesterEmail(user.email, paid),
      optedOut,
      alreadyInvited: invited.has(user.id),
      participation: byTester.get(user.id) || null,
    });
    if (!allowed) continue;
    try {
      await prisma.campaignNotificationDelivery.create({
        data: {
          campaignId,
          recipientUserId: user.id,
          type: MARKETPLACE_INVITE_TYPE,
          dayKey: MARKETPLACE_INVITE_DAY_KEY,
          status: "queued",
        },
      });
      queued += 1;
    } catch (error) {
      if (!uniqueViolation(error)) throw error;
    }
  }
  return { queued };
}

async function loadLiveCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      app: true,
      user: { select: { id: true, developerName: true, name: true, company: true, email: true } },
    },
  });
  if (!campaign || campaign.isDemo) return null;
  if (!campaignIsLive(campaign)) return null;
  return campaign;
}

export async function sendQueuedMarketplaceEmails(input: { campaignId?: string; type: string; limit?: number }) {
  const pending = await prisma.campaignNotificationDelivery.findMany({
    where: {
      type: input.type,
      status: { in: ["queued", "failed"] },
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: input.limit ?? 40,
    include: {
      recipient: { select: { id: true, email: true, name: true, developerName: true } },
      campaign: {
        include: {
          app: true,
          user: { select: { developerName: true, name: true, company: true } },
        },
      },
    },
  });
  let sent = 0;
  let failed = 0;
  for (const row of pending) {
    if (!campaignIsLive(row.campaign)) {
      await prisma.campaignNotificationDelivery.update({
        where: { id: row.id },
        data: { status: "skipped", error: "Campaign is not active." },
      });
      continue;
    }
    const participation = await prisma.testingParticipation.findUnique({
      where: { campaignId_testerUserId: { campaignId: row.campaignId, testerUserId: row.recipientUserId } },
      select: { acceptedAt: true, downloadLinkClickedAt: true, consentAt: true, status: true },
    });
    if (marketplaceParticipationActed(participation)) {
      await prisma.campaignNotificationDelivery.update({
        where: { id: row.id },
        data: { status: "skipped", error: "Tester already acted." },
      });
      continue;
    }
    const result = await deliverMarketplaceEmail(row);
    if (result === "sent") sent += 1;
    if (result === "failed") failed += 1;
  }
  return { sent, failed, processed: pending.length };
}

async function deliverMarketplaceEmail(row: {
  id: string;
  campaignId: string;
  recipientUserId: string;
  type: string;
  dayKey: string;
  recipient: { id: string; email: string; name: string | null; developerName: string | null };
  campaign: {
    id: string;
    userId: string;
    testingType: "INTERNAL" | "CLOSED" | "OPEN";
    startedAt: Date | null;
    endsAt: Date | null;
    durationDays: number;
    testingUrl: string | null;
    webOptInUrl: string | null;
    playStoreUrl: string | null;
    publicSlug: string | null;
    app: { name: string; iconUrl: string | null; packageName: string | null; webOptInUrl: string | null; playStoreUrl: string | null };
    user: { developerName: string | null; name: string | null; company: string | null };
  };
}) {
  const eventKey = `marketplace_${row.type.toLowerCase()}:${row.campaignId}:${row.recipientUserId}:${row.dayKey}`;
  const existing = await prisma.emailEvent.findUnique({ where: { eventKey } });
  if (existing?.status === "sent") {
    await prisma.campaignNotificationDelivery.update({
      where: { id: row.id },
      data: { status: "sent", sentAt: existing.createdAt, error: null },
    });
    return "sent" as const;
  }

  const playUrl = destinationPlayUrl({
    testingType: row.campaign.testingType,
    packageName: row.campaign.app.packageName,
    testingUrl: row.campaign.testingUrl,
    webOptInUrl: row.campaign.webOptInUrl || row.campaign.app.webOptInUrl,
    playStoreUrl: row.campaign.playStoreUrl || row.campaign.app.playStoreUrl,
  });
  const endsAt = row.campaign.endsAt ?? (row.campaign.startedAt ? marketplaceEndsAt(row.campaign.startedAt, row.campaign.durationDays) : marketplaceEndsAt(new Date()));
  const placeholderHash = `pending:${randomToken(16)}`;
  const action = await prisma.campaignEmailAction.create({
    data: {
      campaignId: row.campaignId,
      recipientUserId: row.recipientUserId,
      kind: MARKETPLACE_EMAIL_ACTION_KIND,
      playUrl,
      expiresAt: endsAt,
      tokenHash: placeholderHash,
    },
  });
  const issued = issueMarketplaceActionToken(action.id, endsAt);
  await prisma.campaignEmailAction.update({
    where: { id: action.id },
    data: { tokenHash: issued.nonceHash },
  });

  const developerName = row.campaign.user.company || row.campaign.user.developerName || row.campaign.user.name || "A TestLoop developer";
  const start = row.campaign.startedAt || new Date();
  const mail = marketplaceTestingInviteEmail({
    appName: row.campaign.app.name,
    developerName,
    description: null,
    iconUrl: row.campaign.app.iconUrl,
    testingTypeLabel: testingTypeLabel(row.campaign.testingType),
    testingPeriodLabel: `${start.toISOString().slice(0, 10)} to ${endsAt.toISOString().slice(0, 10)}`,
    playUrlLabel: row.campaign.testingType === "OPEN" ? "Open testing on Google Play" : "Google Play testing / opt-in link (sign-in may be required)",
    acceptUrl: acceptActionUrl(issued.token),
    detailsUrl: row.campaign.publicSlug ? `${origin()}/test/${row.campaign.publicSlug}` : campaignUrl(row.campaign.id),
    reminder: row.type === MARKETPLACE_REMINDER_TYPE,
  });

  try {
    await prisma.emailEvent.create({
      data: {
        userId: row.campaign.userId,
        campaignId: row.campaignId,
        type: row.type === MARKETPLACE_REMINDER_TYPE ? "marketplace_reminder" : "marketplace_invite",
        toAddress: row.recipient.email,
        subject: mail.subject,
        status: smtpConfigured() ? "queued" : "skipped",
        error: smtpConfigured() ? null : "Email sending is not configured on this server.",
        eventKey,
      },
    });
  } catch (error) {
    if (!uniqueViolation(error)) throw error;
    const prior = await prisma.emailEvent.findUnique({ where: { eventKey } });
    if (prior?.status === "sent") {
      await prisma.campaignNotificationDelivery.update({ where: { id: row.id }, data: { status: "sent", sentAt: new Date(), error: null } });
      return "sent" as const;
    }
  }

  if (!smtpConfigured()) {
    await prisma.campaignNotificationDelivery.update({
      where: { id: row.id },
      data: { status: "skipped", error: "Email sending is not configured on this server." },
    });
    return "skipped" as const;
  }

  const sent = await sendSmtpEmail({
    to: row.recipient.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  await prisma.emailEvent.update({
    where: { eventKey },
    data: { status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed", error: sent.ok ? null : sent.error },
  });
  await prisma.campaignNotificationDelivery.update({
    where: { id: row.id },
    data: {
      status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
      sentAt: sent.ok ? new Date() : null,
      error: sent.ok ? null : sent.error,
    },
  });
  return sent.ok ? ("sent" as const) : ("failed" as const);
}

export async function expireMarketplaceCampaigns(now = new Date()) {
  const active = await prisma.campaign.findMany({
    where: { published: true, status: "ACTIVE" },
    select: { id: true, startedAt: true, endsAt: true, durationDays: true, userId: true },
  });
  let expired = 0;
  for (const campaign of active) {
    if (campaignIsLive({ ...campaign, published: true, status: "ACTIVE", now })) continue;
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "EXPIRED", published: false, completedAt: campaign.endsAt ?? now },
    });
    expired += 1;
  }
  return { expired };
}

export async function queueMarketplaceReminders(now = new Date()) {
  const dayKey = karachiDayKey(now);
  const campaigns = await prisma.campaign.findMany({
    where: { published: true, status: "ACTIVE", isDemo: false },
    select: { id: true, userId: true, startedAt: true, endsAt: true, durationDays: true, published: true, status: true },
  });
  const paid = await loadPaidOperationTesterEmails();
  let queued = 0;
  for (const campaign of campaigns) {
    if (!campaignIsLive({ ...campaign, now })) continue;
    const users = await prisma.user.findMany({
      where: { deletedAt: null, suspendedAt: null, demoMode: false, id: { not: campaign.userId } },
      select: {
        id: true,
        email: true,
        settings: { select: { emailNotificationsEnabled: true, notificationPreferences: true, notificationFrequency: true } },
      },
    });
    const [participations, invitedToday, remindedToday, invitedEver] = await Promise.all([
      prisma.testingParticipation.findMany({
        where: { campaignId: campaign.id },
        select: { testerUserId: true, acceptedAt: true, downloadLinkClickedAt: true, consentAt: true, status: true },
      }),
      prisma.campaignNotificationDelivery.findMany({
        where: { campaignId: campaign.id, type: MARKETPLACE_INVITE_TYPE, dayKey: MARKETPLACE_INVITE_DAY_KEY, createdAt: { gte: startOfKarachiDay(now) } },
        select: { recipientUserId: true },
      }),
      prisma.campaignNotificationDelivery.findMany({
        where: { campaignId: campaign.id, type: MARKETPLACE_REMINDER_TYPE, dayKey },
        select: { recipientUserId: true },
      }),
      prisma.campaignNotificationDelivery.findMany({
        where: { campaignId: campaign.id, type: MARKETPLACE_INVITE_TYPE, dayKey: MARKETPLACE_INVITE_DAY_KEY },
        select: { recipientUserId: true },
      }),
    ]);
    const byTester = new Map(participations.map((row) => [row.testerUserId, row]));
    const invitedTodayIds = new Set(invitedToday.map((row) => row.recipientUserId));
    const remindedIds = new Set(remindedToday.map((row) => row.recipientUserId));
    const invitedIds = new Set(invitedEver.map((row) => row.recipientUserId));
    for (const user of users) {
      if (!invitedIds.has(user.id)) continue;
      const prefs = parseNotificationPreferences(user.settings?.notificationPreferences);
      const optedOut = user.settings?.emailNotificationsEnabled === false || user.settings?.notificationFrequency === "disabled" || prefs.testingMarketplace === false;
      const allowed = marketplaceReminderAllowed({
        campaignLive: true,
        isOwner: false,
        paidOperationTester: isPaidOperationTesterEmail(user.email, paid),
        optedOut,
        alreadyRemindedToday: remindedIds.has(user.id),
        invitedToday: invitedTodayIds.has(user.id),
        participation: byTester.get(user.id) || null,
      });
      if (!allowed) continue;
      try {
        await prisma.campaignNotificationDelivery.create({
          data: {
            campaignId: campaign.id,
            recipientUserId: user.id,
            type: MARKETPLACE_REMINDER_TYPE,
            dayKey,
            status: "queued",
          },
        });
        queued += 1;
      } catch (error) {
        if (!uniqueViolation(error)) throw error;
      }
    }
  }
  return { queued };
}

function startOfKarachiDay(now: Date) {
  const key = karachiDayKey(now);
  return new Date(`${key}T00:00:00+05:00`);
}

export async function processMarketplaceNotificationJobs() {
  const expired = await expireMarketplaceCampaigns();
  const invites = await sendQueuedMarketplaceEmails({ type: MARKETPLACE_INVITE_TYPE, limit: 50 });
  const reminderQueue = await queueMarketplaceReminders();
  const reminders = await sendQueuedMarketplaceEmails({ type: MARKETPLACE_REMINDER_TYPE, limit: 50 });
  return { expired, invites, reminderQueue, reminders };
}

export async function performMarketplaceEmailAction(token: string) {
  const payload = verifyMarketplaceActionToken(token);
  if (!payload) {
    throw new AppError("This invitation link is invalid or has expired.", 400, "EMAIL_ACTION_INVALID");
  }
  const action = await prisma.campaignEmailAction.findUnique({
    where: { id: payload.aid },
    include: {
      campaign: { include: { app: true } },
      recipient: { select: { id: true, email: true, name: true, developerName: true } },
    },
  });
  if (!action || action.tokenHash !== sha256(payload.n)) {
    throw new AppError("This invitation link is invalid or has expired.", 400, "EMAIL_ACTION_INVALID");
  }
  if (action.expiresAt.getTime() <= Date.now() || !campaignIsLive(action.campaign)) {
    throw new AppError("This testing campaign is no longer active.", 410, "EMAIL_ACTION_EXPIRED");
  }
  const playUrl = isSafePlayRedirect(action.playUrl)
    ? action.playUrl
    : destinationPlayUrl({
        testingType: action.campaign.testingType,
        packageName: action.campaign.app.packageName,
        testingUrl: action.campaign.testingUrl,
        webOptInUrl: action.campaign.webOptInUrl || action.campaign.app.webOptInUrl,
        playStoreUrl: action.campaign.playStoreUrl || action.campaign.app.playStoreUrl,
      });

  const accepted = await recordMarketplaceAcceptance({
    campaignId: action.campaignId,
    testerUserId: action.recipientUserId,
    ownerUserId: action.campaign.userId,
    playUrl,
    markDownloadClicked: true,
  });

  if (!action.usedAt) {
    await prisma.campaignEmailAction.update({
      where: { id: action.id },
      data: { usedAt: new Date() },
    });
  }

  return {
    ok: true as const,
    alreadyProcessed: accepted.alreadyProcessed,
    campaignId: action.campaignId,
    appName: action.campaign.app.name,
    playUrl,
    testerUserId: action.recipientUserId,
  };
}

export async function recordMarketplaceAcceptance(input: {
  campaignId: string;
  testerUserId: string;
  ownerUserId: string;
  playUrl: string | null;
  markDownloadClicked: boolean;
}) {
  const existing = await prisma.testingParticipation.findUnique({
    where: { campaignId_testerUserId: { campaignId: input.campaignId, testerUserId: input.testerUserId } },
  });
  const now = new Date();
  const alreadyAccepted = Boolean(existing?.acceptedAt || existing?.consentAt);
  const alreadyDownloaded = Boolean(existing?.downloadLinkClickedAt);
  const participation = existing
    ? await prisma.testingParticipation.update({
        where: { id: existing.id },
        data: {
          source: existing.source || "EMAIL",
          status: existing.status === "DECLINED" ? existing.status : existing.status === "REQUESTED" ? "ACCEPTED" : existing.status,
          acceptedAt: existing.acceptedAt || now,
          downloadLinkClickedAt: input.markDownloadClicked ? existing.downloadLinkClickedAt || now : existing.downloadLinkClickedAt,
        },
      })
    : await prisma.testingParticipation.create({
        data: {
          campaignId: input.campaignId,
          ownerUserId: input.ownerUserId,
          testerUserId: input.testerUserId,
          status: "ACCEPTED",
          source: "EMAIL",
          acceptedAt: now,
          downloadLinkClickedAt: input.markDownloadClicked ? now : null,
        },
      }).catch(async (error) => {
        if (!uniqueViolation(error)) throw error;
        const raced = await prisma.testingParticipation.findUniqueOrThrow({
          where: { campaignId_testerUserId: { campaignId: input.campaignId, testerUserId: input.testerUserId } },
        });
        return prisma.testingParticipation.update({
          where: { id: raced.id },
          data: {
            source: raced.source || "EMAIL",
            acceptedAt: raced.acceptedAt || now,
            downloadLinkClickedAt: input.markDownloadClicked ? raced.downloadLinkClickedAt || now : raced.downloadLinkClickedAt,
          },
        });
      });

  const tester = await prisma.user.findUnique({
    where: { id: input.testerUserId },
    select: { email: true, name: true, developerName: true },
  });
  const app = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { app: { select: { name: true } } },
  });
  const testerLabel = tester?.developerName || tester?.name || tester?.email || "A tester";
  const appName = app?.app.name || "your app";
  const href = `/campaigns/${input.campaignId}`;

  if (!alreadyAccepted) {
    const mail = developerMarketplaceAcceptedEmail({
      testerLabel,
      appName,
      campaignUrl: campaignUrl(input.campaignId),
    });
    await sendDeveloperNotification({
      userId: input.ownerUserId,
      type: "marketplace_accepted",
      eventKey: `marketplace_accepted:${input.campaignId}:${input.testerUserId}`,
      preference: "testerAccepted",
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      campaignId: input.campaignId,
      immediate: true,
      inApp: { title: "Tester accepted your invitation", body: `${testerLabel} accepted testing for ${appName}.`, href },
    });
  }
  if (input.markDownloadClicked && !alreadyDownloaded) {
    const mail = developerMarketplaceDownloadOpenedEmail({
      testerLabel,
      appName,
      campaignUrl: campaignUrl(input.campaignId),
    });
    await sendDeveloperNotification({
      userId: input.ownerUserId,
      type: "marketplace_download_opened",
      eventKey: `marketplace_download:${input.campaignId}:${input.testerUserId}`,
      preference: "testerAccepted",
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      campaignId: input.campaignId,
      immediate: true,
      inApp: {
        title: "Tester opened the download link",
        body: `${testerLabel} opened the Google Play testing/download link for ${appName}. This does not confirm installation.`,
        href,
      },
    });
  }

  return { participation, alreadyProcessed: alreadyAccepted && (!input.markDownloadClicked || alreadyDownloaded) };
}

export async function getMarketplaceCampaignStats(campaignId: string, appId: string, ownerUserId: string) {
  const [invited, accepted, downloads, paid] = await Promise.all([
    prisma.campaignNotificationDelivery.count({
      where: { campaignId, type: MARKETPLACE_INVITE_TYPE, status: "sent" },
    }),
    prisma.testingParticipation.count({
      where: { campaignId, OR: [{ acceptedAt: { not: null } }, { consentAt: { not: null } }] },
    }),
    prisma.testingParticipation.count({
      where: { campaignId, downloadLinkClickedAt: { not: null } },
    }),
    prisma.managedTestingCampaign.findFirst({
      where: { appId, userId: ownerUserId, status: { in: ["ACTIVE", "READY"] } },
      select: { testerTarget: true, _count: { select: { assignments: true } } },
    }),
  ]);
  return {
    invitationsSent: invited,
    invitationsAccepted: accepted,
    downloadLinksClicked: downloads,
    paidTestersAssigned: paid?._count.assignments ?? 0,
    paidTesterTarget: paid?.testerTarget ?? 0,
  };
}
