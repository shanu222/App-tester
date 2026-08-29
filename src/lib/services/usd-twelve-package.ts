import type { TestingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendSmtpEmail } from "@/lib/smtp";
import { formatDateTime } from "@/lib/utils";
import { validateManagedCampaignSetup } from "@/lib/managed-testing/setup";
import {
  formatPackageAmount,
  paymentReference,
  publicAssignmentId,
  publicCampaignId,
  publicPaymentId,
  publicTesterId,
} from "@/lib/managed-testing/catalog";
import { PAYMENTS_ADMIN_EMAIL, isWalletPurchaseMethod, providerForMethod, type UsdTwelvePaymentChoice } from "@/lib/managed-testing/methods";
import { resolveCheckoutProvider } from "@/lib/managed-testing/payments";
import { paddleCheckoutConfigured } from "@/lib/paddle/config";
import { ensurePaddleCheckoutTransaction } from "@/lib/paddle/checkout";
import {
  USD_TWELVE_DURATION_DAYS,
  USD_TWELVE_PACKAGE_CODE,
  USD_TWELVE_TESTER_COUNT,
  USD_TWELVE_TESTER_EMAILS,
  USD_TWELVE_WHATSAPP_DISPLAY,
  USD_TWELVE_WHATSAPP_HREF,
  formatUsd,
  isUsdTwelvePackage,
  parseUsdTwelveFulfillment,
  usdTwelveProgressStatus,
  usdTwelveTesterLabel,
  usdTwelveTestingTypeLabel,
  type UsdTwelveFulfillment,
} from "@/lib/managed-testing/usd-twelve";
import {
  usdTwelveAdminCompletedEmail,
  usdTwelveAdminPurchasedEmail,
  usdTwelveAdminTesterUpdateEmail,
  usdTwelveTesterInviteEmail,
} from "@/lib/notifications/templates";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function origin() {
  return env.appUrl.replace(/\/$/, "");
}

function campaignUrl(publicId: string) {
  return `${origin()}/managed-testing/${publicId}`;
}

function confirmUrl(token: string) {
  return `${origin()}/managed-testing/confirm/${encodeURIComponent(token)}`;
}

function parseFulfillment(value: unknown): UsdTwelveFulfillment | null {
  return parseUsdTwelveFulfillment(value);
}

async function logEmail(input: {
  userId: string;
  type: string;
  to: string;
  subject: string;
  eventKey: string;
  sent: { ok: boolean; skipped?: boolean; error?: string };
}) {
  try {
    await prisma.emailEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        toAddress: input.to,
        subject: input.subject,
        status: input.sent.ok ? "sent" : input.sent.skipped ? "skipped" : "failed",
        error: input.sent.ok ? null : input.sent.error || null,
        eventKey: input.eventKey,
      },
    });
  } catch {
    // Unique eventKey — already logged.
  }
}

async function alreadyLogged(eventKey: string) {
  const existing = await prisma.emailEvent.findUnique({ where: { eventKey } });
  return Boolean(existing);
}

export async function getUsdTwelvePackage() {
  return prisma.managedTestingPackage.findFirst({
    where: { code: USD_TWELVE_PACKAGE_CODE, active: true },
  });
}

export async function ensureUsdTwelvePool() {
  const unique = [...new Set(USD_TWELVE_TESTER_EMAILS.map((email) => email.toLowerCase()))];
  if (unique.length !== USD_TWELVE_TESTER_COUNT) {
    throw new AppError("The 12-tester pool is misconfigured.");
  }
  for (const [index, email] of unique.entries()) {
    await prisma.managedFixedPoolEmail.upsert({
      where: { packageCode_email: { packageCode: USD_TWELVE_PACKAGE_CODE, email } },
      update: { sortOrder: index + 1 },
      create: { packageCode: USD_TWELVE_PACKAGE_CODE, email, sortOrder: index + 1 },
    });
    const existing = await prisma.managedTester.findUnique({ where: { email } });
    if (existing) {
      if (existing.reservedPackageCode !== USD_TWELVE_PACKAGE_CODE || existing.availableForTesting) {
        await prisma.managedTester.update({
          where: { id: existing.id },
          data: { reservedPackageCode: USD_TWELVE_PACKAGE_CODE, availableForTesting: false },
        });
      }
      continue;
    }
    await prisma.managedTester.create({
      data: {
        publicId: publicTesterId(),
        name: usdTwelveTesterLabel(index),
        email,
        googleAccountEmail: email,
        consentStatus: "CONSENTED",
        availableForTesting: false,
        reservedPackageCode: USD_TWELVE_PACKAGE_CODE,
      },
    });
  }
}

export async function startUsdTwelveCheckout(
  userId: string,
  input: { appId: string; testingType: TestingType; testingUrl: string; paymentMethod: UsdTwelvePaymentChoice },
) {
  const pack = await getUsdTwelvePackage();
  if (!pack) throw new NotFoundError("The $10 12-tester package is not available.");
  const app = await prisma.app.findFirst({
    where: { id: input.appId, userId },
    select: { id: true, name: true, webOptInUrl: true },
  });
  if (!app) throw new AppError("Select one of your apps.");
  const validated = validateManagedCampaignSetup({
    testingType: input.testingType,
    testingUrl: input.testingUrl || app.webOptInUrl,
  });
  if (!validated.ok) throw new AppError(validated.error);
  await ensureUsdTwelvePool();
  const fulfillment: UsdTwelveFulfillment = {
    appId: app.id,
    testingType: input.testingType,
    testingUrl: validated.testingUrl || "",
  };
  const wantsPaddle = input.paymentMethod === "PADDLE";
  if (wantsPaddle && !paddleCheckoutConfigured()) {
    throw new AppError(
      "Paddle sandbox checkout is not configured yet. Choose EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance.",
      503,
      "PADDLE_NOT_CONFIGURED",
    );
  }
  if (wantsPaddle) {
    const payment = await prisma.managedTestingPayment.create({
      data: {
        publicId: publicPaymentId(),
        userId,
        packageId: pack.id,
        amountPkr: pack.amountPkr,
        currency: pack.currency,
        provider: "PADDLE",
        status: "PENDING_PAYMENT",
        transactionReference: paymentReference(),
        fulfillment,
      },
    });
    const checkout = await ensurePaddleCheckoutTransaction({ userId, paymentPublicId: payment.publicId });
    return {
      paymentPublicId: payment.publicId,
      paddleCheckout: true as const,
      paddleTransactionId: checkout.transactionId,
    };
  }
  if (!isWalletPurchaseMethod(input.paymentMethod)) {
    throw new AppError("Choose Paddle or a wallet payment method.");
  }
  const provider = resolveCheckoutProvider() === "stub" ? "STUB" : providerForMethod(input.paymentMethod);
  const payment = await prisma.managedTestingPayment.create({
    data: {
      publicId: publicPaymentId(),
      userId,
      packageId: pack.id,
      amountPkr: pack.amountPkr,
      currency: pack.currency,
      provider,
      method: input.paymentMethod,
      status: "PENDING_PAYMENT",
      transactionReference: paymentReference(),
      fulfillment,
    },
  });
  return { paymentPublicId: payment.publicId, paddleCheckout: false as const, paddleTransactionId: null };
}

export async function fulfillUsdTwelvePackage(paymentId: string) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { id: paymentId },
    include: {
      package: true,
      campaign: true,
      user: { select: { email: true, name: true, developerName: true } },
    },
  });
  if (!payment || !isUsdTwelvePackage(payment.package.code)) return null;
  const fulfillment = parseFulfillment(payment.fulfillment);
  if (!fulfillment) {
    throw new AppError("Select an app and Google Play testing link before this package can start.");
  }
  await ensureUsdTwelvePool();
  let campaign = payment.campaign;
  if (!campaign) {
    campaign = await prisma.managedTestingCampaign.create({
      data: {
        publicId: publicCampaignId(),
        userId: payment.userId,
        paymentId: payment.id,
        testerTarget: USD_TWELVE_TESTER_COUNT,
        durationDays: USD_TWELVE_DURATION_DAYS,
        status: "DRAFT",
      },
    });
  }
  if (campaign.status === "COMPLETED") {
    return { campaignPublicId: campaign.publicId, alreadyStarted: true as const };
  }
  const assigned = await prisma.managedCampaignTester.count({ where: { campaignId: campaign.id } });
  if (assigned === 0) {
    await assignUsdTwelveTesters(campaign.id);
  }
  const now = payment.paidAt || new Date();
  const started = await prisma.managedTestingCampaign.update({
    where: { id: campaign.id },
    data: {
      appId: fulfillment.appId,
      testingType: fulfillment.testingType,
      testingUrl: fulfillment.testingUrl,
      status: "ACTIVE",
      startedAt: campaign.startedAt ?? now,
      endsAt: campaign.endsAt ?? new Date(now.getTime() + USD_TWELVE_DURATION_DAYS * 86_400_000),
      durationDays: USD_TWELVE_DURATION_DAYS,
      testerTarget: USD_TWELVE_TESTER_COUNT,
    },
    include: { app: { select: { name: true } } },
  });
  await sendUsdTwelveInvites(started.id);
  await notifyAdminPurchase({
    paymentId: payment.id,
    userId: payment.userId,
    developerName: payment.user.developerName || payment.user.name || payment.user.email,
    developerEmail: payment.user.email,
    appName: started.app?.name || "App",
    amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
    paymentStatus: payment.status,
    campaignPublicId: started.publicId,
    purchaseDate: payment.paidAt || payment.createdAt,
    startDate: started.startedAt || now,
    endDate: started.endsAt || now,
  });
  return { campaignPublicId: started.publicId, alreadyStarted: campaign.status === "ACTIVE" };
}

async function assignUsdTwelveTesters(campaignId: string) {
  const pool = await prisma.managedFixedPoolEmail.findMany({
    where: { packageCode: USD_TWELVE_PACKAGE_CODE },
    orderBy: { sortOrder: "asc" },
  });
  if (pool.length !== USD_TWELVE_TESTER_COUNT) {
    throw new AppError("The 12-tester pool is incomplete.");
  }
  let index = 0;
  for (const row of pool) {
    const tester = await prisma.managedTester.findUnique({ where: { email: row.email } });
    if (!tester) continue;
    const existing = await prisma.managedCampaignTester.findUnique({
      where: { campaignId_testerId: { campaignId, testerId: tester.id } },
    });
    if (existing) {
      index += 1;
      continue;
    }
    await prisma.$transaction([
      prisma.managedCampaignTester.create({
        data: {
          publicId: publicAssignmentId(),
          campaignId,
          testerId: tester.id,
          displayLabel: usdTwelveTesterLabel(index),
          testingStatus: "INVITED",
          invitedAt: new Date(),
        },
      }),
      prisma.managedTester.update({
        where: { id: tester.id },
        data: { currentlyAssigned: true },
      }),
    ]);
    index += 1;
  }
}

export async function sendUsdTwelveInvites(campaignId: string, options?: { retryFailed?: boolean }) {
  const campaign = await prisma.managedTestingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      app: { select: { name: true } },
      user: { select: { developerName: true, name: true } },
      payment: { include: { package: true } },
      assignments: { include: { tester: true } },
    },
  });
  if (!campaign?.testingUrl || !isUsdTwelvePackage(campaign.payment.package.code)) {
    return { sent: 0, failed: 0 };
  }
  const developerName = campaign.user.developerName || campaign.user.name || "A TestLoop developer";
  let sent = 0;
  let failed = 0;
  for (const assignment of campaign.assignments) {
    if (assignment.invitationStatus === "SENT") continue;
    if (options?.retryFailed && assignment.invitationStatus !== "FAILED") continue;
    const token = randomToken(32);
    await prisma.managedCampaignTester.update({
      where: { id: assignment.id },
      data: {
        inviteTokenHash: sha256(token),
        inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
    const template = usdTwelveTesterInviteEmail({
      appName: campaign.app?.name || "the test app",
      developerName,
      testingTypeLabel: usdTwelveTestingTypeLabel(campaign.testingType),
      joinUrl: campaign.testingUrl,
      confirmUrl: confirmUrl(token),
      whatsappHref: USD_TWELVE_WHATSAPP_HREF,
      whatsappDisplay: USD_TWELVE_WHATSAPP_DISPLAY,
    });
    const sentKey = `usd12_invite:${assignment.id}:sent`;
    if (await alreadyLogged(sentKey)) {
      await prisma.managedCampaignTester.update({
        where: { id: assignment.id },
        data: { invitationStatus: "SENT", testingStatus: "EMAIL_SENT", emailSentAt: assignment.emailSentAt ?? new Date() },
      });
      sent += 1;
      continue;
    }
    const result = await sendSmtpEmail({
      to: assignment.tester.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    await logEmail({
      userId: campaign.userId,
      type: "usd12_tester_invite",
      to: assignment.tester.email,
      subject: template.subject,
      eventKey: result.ok ? sentKey : `usd12_invite:${assignment.id}:fail:${Date.now()}`,
      sent: result,
    });
    await prisma.managedCampaignTester.update({
      where: { id: assignment.id },
      data: {
        invitationStatus: result.ok ? "SENT" : "FAILED",
        testingStatus: result.ok ? "EMAIL_SENT" : assignment.testingStatus,
        emailSentAt: result.ok ? new Date() : assignment.emailSentAt,
      },
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

async function notifyAdminPurchase(input: {
  paymentId: string;
  userId: string;
  developerName: string;
  developerEmail: string;
  appName: string;
  amountLabel: string;
  paymentStatus: string;
  campaignPublicId: string;
  purchaseDate: Date;
  startDate: Date;
  endDate: Date;
}) {
  const eventKey = `usd12_admin_purchased:${input.paymentId}`;
  if (await alreadyLogged(eventKey)) return;
  const mail = usdTwelveAdminPurchasedEmail({
    developerName: input.developerName,
    developerEmail: input.developerEmail,
    appName: input.appName,
    amountLabel: input.amountLabel,
    paymentStatus: input.paymentStatus,
    campaignId: input.campaignPublicId,
    purchaseDate: formatDateTime(input.purchaseDate),
    startDate: formatDateTime(input.startDate),
    endDate: formatDateTime(input.endDate),
    campaignUrl: campaignUrl(input.campaignPublicId),
  });
  const sent = await sendSmtpEmail({ to: PAYMENTS_ADMIN_EMAIL, ...mail });
  await logEmail({
    userId: input.userId,
    type: "usd12_admin_purchased",
    to: PAYMENTS_ADMIN_EMAIL,
    subject: mail.subject,
    eventKey,
    sent,
  });
}

export async function findUsdTwelveAssignmentByToken(token: string) {
  const hash = sha256(token.trim());
  return prisma.managedCampaignTester.findFirst({
    where: { inviteTokenHash: hash, inviteTokenExpiresAt: { gt: new Date() } },
    include: { campaign: { include: { payment: { include: { package: true } } } } },
  });
}

export async function notifyUsdTwelveAfterConfirmation(assignmentPublicId: string, hadScreenshot: boolean) {
  const assignment = await prisma.managedCampaignTester.findUnique({
    where: { publicId: assignmentPublicId },
    include: {
      tester: true,
      confirmation: true,
      campaign: {
        include: {
          app: { select: { name: true } },
          user: { select: { email: true, name: true, developerName: true } },
          payment: { include: { package: true } },
          assignments: { include: { confirmation: true } },
        },
      },
    },
  });
  if (!assignment || !isUsdTwelvePackage(assignment.campaign.payment.package.code)) return;
  const campaign = assignment.campaign;
  const confirmed = campaign.assignments.filter((row) => row.confirmationStatus === "CONFIRMED").length;
  const screenshots = campaign.assignments.filter((row) => row.confirmation?.screenshotMime).length;
  const developerName = campaign.user.developerName || campaign.user.name || campaign.user.email;
  const appName = campaign.app?.name || "App";
  const startDate = formatDateTime(campaign.startedAt);
  const endDate = formatDateTime(campaign.endsAt);
  const kind = hadScreenshot ? "screenshot" : "confirmed";
  const eventKey = hadScreenshot ? `usd12_admin_screenshot:${assignment.id}` : `usd12_admin_confirmed:${assignment.id}`;
  if (!(await alreadyLogged(eventKey))) {
    const mail = usdTwelveAdminTesterUpdateEmail({
      kind,
      developerName,
      appName,
      testerLabel: assignment.displayLabel,
      confirmed,
      screenshots,
      startDate,
      endDate,
      campaignUrl: campaignUrl(campaign.publicId),
    });
    const sent = await sendSmtpEmail({ to: PAYMENTS_ADMIN_EMAIL, ...mail });
    await logEmail({
      userId: campaign.userId,
      type: `usd12_admin_${kind}`,
      to: PAYMENTS_ADMIN_EMAIL,
      subject: mail.subject,
      eventKey,
      sent,
    });
  }
  if (confirmed === USD_TWELVE_TESTER_COUNT) {
    const allKey = `usd12_admin_all12:${campaign.id}`;
    if (!(await alreadyLogged(allKey))) {
      const mail = usdTwelveAdminTesterUpdateEmail({
        kind: "all12",
        developerName,
        appName,
        testerLabel: "12/12",
        confirmed,
        screenshots,
        startDate,
        endDate,
        campaignUrl: campaignUrl(campaign.publicId),
      });
      const sent = await sendSmtpEmail({ to: PAYMENTS_ADMIN_EMAIL, ...mail });
      await logEmail({
        userId: campaign.userId,
        type: "usd12_admin_all12",
        to: PAYMENTS_ADMIN_EMAIL,
        subject: mail.subject,
        eventKey: allKey,
        sent,
      });
    }
  }
}

export async function notifyUsdTwelveLifecycle(now = new Date()) {
  const completed = await prisma.managedTestingCampaign.findMany({
    where: {
      status: "COMPLETED",
      payment: { package: { code: USD_TWELVE_PACKAGE_CODE } },
      completedAt: { not: null },
    },
    include: {
      app: { select: { name: true } },
      user: { select: { email: true, name: true, developerName: true } },
      assignments: { include: { confirmation: true } },
    },
    take: 40,
  });
  let notified = 0;
  for (const campaign of completed) {
    const eventKey = `usd12_admin_completed:${campaign.id}`;
    if (await alreadyLogged(eventKey)) continue;
    const mail = usdTwelveAdminCompletedEmail({
      developerName: campaign.user.developerName || campaign.user.name || campaign.user.email,
      appName: campaign.app?.name || "App",
      confirmed: campaign.assignments.filter((row) => row.confirmationStatus === "CONFIRMED").length,
      screenshots: campaign.assignments.filter((row) => row.confirmation?.screenshotMime).length,
      startDate: formatDateTime(campaign.startedAt),
      endDate: formatDateTime(campaign.endsAt || now),
      campaignUrl: campaignUrl(campaign.publicId),
    });
    const sent = await sendSmtpEmail({ to: PAYMENTS_ADMIN_EMAIL, ...mail });
    await logEmail({
      userId: campaign.userId,
      type: "usd12_admin_completed",
      to: PAYMENTS_ADMIN_EMAIL,
      subject: mail.subject,
      eventKey,
      sent,
    });
    notified += 1;
  }
  return { notified };
}

export async function retryUsdTwelveFailedInvites(campaignPublicId: string) {
  const campaign = await prisma.managedTestingCampaign.findFirst({
    where: { publicId: campaignPublicId, payment: { package: { code: USD_TWELVE_PACKAGE_CODE } } },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return sendUsdTwelveInvites(campaign.id, { retryFailed: true });
}

export async function adminFulfillUsdTwelveCampaign(campaignPublicId: string) {
  const campaign = await prisma.managedTestingCampaign.findFirst({
    where: { publicId: campaignPublicId, payment: { package: { code: USD_TWELVE_PACKAGE_CODE } } },
    include: { payment: true },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return fulfillUsdTwelvePackage(campaign.paymentId);
}

export async function exportUsdTwelveEvidenceCsv(campaignPublicId: string) {
  const campaign = await prisma.managedTestingCampaign.findFirst({
    where: { publicId: campaignPublicId, payment: { package: { code: USD_TWELVE_PACKAGE_CODE } } },
    include: {
      app: { select: { name: true } },
      assignments: { include: { tester: true, confirmation: true } },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  const lines = [
    ["Tester", "Email", "Invitation", "Confirmation", "Confirmed at", "Screenshot"].join(","),
    ...campaign.assignments.map((row) =>
      [
        csv(row.displayLabel),
        csv(row.tester.email),
        csv(row.invitationStatus === "FAILED" ? "EMAIL_FAILED" : row.invitationStatus),
        csv(row.confirmationStatus === "CONFIRMED" ? "Tester confirmed testing" : "Pending"),
        csv(row.confirmedAt?.toISOString() || ""),
        csv(row.confirmation?.screenshotMime ? "Received" : "None"),
      ].join(","),
    ),
  ];
  const appName = campaign.app?.name?.replace(/[^\w]+/g, "-") || "campaign";
  return {
    filename: `${appName}-testing-evidence.csv`,
    csv: lines.join("\n"),
  };
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function adminGetUsdTwelveScreenshot(assignmentPublicId: string) {
  const assignment = await prisma.managedCampaignTester.findFirst({
    where: {
      publicId: assignmentPublicId,
      campaign: { payment: { package: { code: USD_TWELVE_PACKAGE_CODE } } },
    },
    include: { confirmation: true },
  });
  if (!assignment?.confirmation?.screenshotBytes) throw new NotFoundError("No screenshot uploaded.");
  return {
    mime: assignment.confirmation.screenshotMime || "image/jpeg",
    bytes: Buffer.from(assignment.confirmation.screenshotBytes),
  };
}

export async function listUsdTwelveAdminCampaigns() {
  const campaigns = await prisma.managedTestingCampaign.findMany({
    where: { payment: { package: { code: USD_TWELVE_PACKAGE_CODE } } },
    include: {
      app: { select: { name: true } },
      user: { select: { email: true, name: true, developerName: true } },
      payment: true,
      assignments: { include: { tester: true, confirmation: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return campaigns.map((campaign) => {
    const confirmed = campaign.assignments.filter((row) => row.confirmationStatus === "CONFIRMED").length;
    const invited = campaign.assignments.filter((row) => row.invitationStatus === "SENT").length;
    const screenshots = campaign.assignments.filter((row) => row.confirmation?.screenshotMime).length;
    const now = new Date();
    const remaining = campaign.endsAt
      ? Math.max(0, Math.ceil((campaign.endsAt.getTime() - now.getTime()) / 86_400_000))
      : USD_TWELVE_DURATION_DAYS;
    return {
      publicId: campaign.publicId,
      developerName: campaign.user.developerName || campaign.user.name || campaign.user.email,
      developerEmail: campaign.user.email,
      appName: campaign.app?.name || "—",
      purchaseDate: campaign.payment.paidAt?.toISOString() || campaign.payment.createdAt.toISOString(),
      paymentStatus: campaign.payment.status,
      amountLabel: formatUsd(campaign.payment.amountPkr),
      startDate: campaign.startedAt?.toISOString() ?? null,
      endDate: campaign.endsAt?.toISOString() ?? null,
      daysRemaining: campaign.status === "ACTIVE" ? remaining : 0,
      status: campaign.status,
      stats: {
        total: USD_TWELVE_TESTER_COUNT,
        invited,
        confirmed,
        pending: Math.max(0, USD_TWELVE_TESTER_COUNT - confirmed),
        screenshots,
        allConfirmed: confirmed === USD_TWELVE_TESTER_COUNT,
      },
      testers: campaign.assignments.map((row) => ({
        publicId: row.publicId,
        label: row.displayLabel,
        email: row.tester.email,
        invitationStatus: row.invitationStatus,
        confirmationStatus: row.confirmationStatus,
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
        hasScreenshot: Boolean(row.confirmation?.screenshotMime),
        progressStatus: usdTwelveProgressStatus({
          invitationStatus: row.invitationStatus,
          confirmationStatus: row.confirmationStatus,
          hasScreenshot: Boolean(row.confirmation?.screenshotMime),
        }),
      })),
    };
  });
}
