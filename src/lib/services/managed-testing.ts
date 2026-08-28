import type { ManagedPaymentStatus, ManagedReportFrequency, TestingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError, RateLimitError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { describeEmail } from "@/lib/email-extract";
import { sendSmtpEmail } from "@/lib/smtp";
import { sendDeveloperNotification } from "@/lib/services/notifications";
import { testingTypeLabel } from "@/lib/campaign-autofill";
import {
  MANAGED_TESTING_DURATION_DAYS,
  formatPackageAmount,
  paymentReference,
  publicAssignmentId,
  publicCampaignId,
  publicPaymentId,
  publicTesterId,
} from "@/lib/managed-testing/catalog";
import { campaignDayProgress } from "@/lib/managed-testing/labels";
import {
  manualPayeeInstructions,
  managedTestingStubPaymentsAllowed,
  resolveCheckoutProvider,
  whatsappReportingConfigured,
} from "@/lib/managed-testing/payments";
import {
  PAYMENTS_ADMIN_EMAIL,
  PAYMENT_PROOF_WHATSAPP,
  paymentCanSubmitProof,
  paymentIsActivated,
  paymentMethodById,
  paymentMethods,
  paymentNeedsReview,
  providerForMethod,
  validatePaymentProof,
  type PaymentMethodId,
} from "@/lib/managed-testing/methods";
import { testerDisplayLabel, validateManagedCampaignSetup } from "@/lib/managed-testing/setup";
import { USD_TWELVE_PACKAGE_CODE, isUsdTwelvePackage, parseUsdTwelveFulfillment } from "@/lib/managed-testing/usd-twelve";
import { issuePaymentConfirmToken } from "@/lib/managed-testing/payment-confirm-token";
import { fulfillUsdTwelvePackage } from "@/lib/services/usd-twelve-package";
import { formatDateTime } from "@/lib/utils";
import { logActivity } from "@/lib/audit";
import {
  isScheduledSendDue,
  parseNotificationTime,
  resolveTimeZone,
} from "@/lib/notifications/schedule";
import {
  managedTesterInviteEmail,
  managedTesterReminderEmail,
  managedTestingDailyReportEmail,
  playIssueEmail,
  adminPaymentReviewEmail,
  developerPaymentApprovedEmail,
  developerPaymentRejectedEmail,
  usdTwelveAdminProofReviewEmail,
  usdTwelveDeveloperActivatedEmail,
} from "@/lib/notifications/templates";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SCREENSHOT_MAX_BYTES = 400 * 1024;
const SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function campaignUrl(publicId: string) {
  return `${env.appUrl.replace(/\/$/, "")}/managed-testing/${publicId}`;
}

function confirmUrl(token: string) {
  return `${env.appUrl.replace(/\/$/, "")}/managed-testing/join/${encodeURIComponent(token)}`;
}

function appNameOf(campaign: { app: { name: string } | null }) {
  return campaign.app?.name || "your app";
}

async function notifyDeveloper(
  userId: string,
  input: { type: string; eventKey: string; title: string; body: string; href: string; immediate?: boolean },
) {
  const template = playIssueEmail({ title: input.title, body: input.body, href: `${env.appUrl.replace(/\/$/, "")}${input.href}` });
  await sendDeveloperNotification({
    userId,
    type: input.type,
    eventKey: input.eventKey,
    preference: "managedTesting",
    subject: template.subject,
    text: template.text,
    html: template.html,
    immediate: input.immediate ?? true,
    inApp: { title: input.title, body: input.body, href: input.href },
  });
}

export async function listManagedPackages() {
  return prisma.managedTestingPackage.findMany({
    where: { active: true, code: USD_TWELVE_PACKAGE_CODE },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listDeveloperManagedCampaigns(userId: string) {
  const [campaigns, pendingPayments] = await Promise.all([
    prisma.managedTestingCampaign.findMany({
      where: { userId },
      include: {
        app: { select: { name: true, iconUrl: true } },
        payment: { include: { package: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.managedTestingPayment.findMany({
      where: { userId, status: { in: ["PENDING", "PENDING_PAYMENT", "PROOF_SUBMITTED", "UNDER_REVIEW", "REJECTED"] }, campaign: null },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { campaigns, pendingPayments };
}

export async function startCheckout(userId: string, packageCode: string) {
  const pack = await prisma.managedTestingPackage.findFirst({
    where: { code: packageCode, active: true },
  });
  if (!pack) throw new NotFoundError("That tester package is not available.");
  if (isUsdTwelvePackage(pack.code)) {
    throw new AppError("Purchase the 12-tester package from the dedicated checkout page.");
  }
  if (pack.contactOnly) {
    throw new AppError("Contact us to arrange a custom managed testing package.", 400, "CONTACT_SALES");
  }
  const provider = resolveCheckoutProvider();
  const payment = await prisma.managedTestingPayment.create({
    data: {
      publicId: publicPaymentId(),
      userId,
      packageId: pack.id,
      amountPkr: pack.amountPkr,
      currency: pack.currency,
      provider: provider === "stub" ? "STUB" : "MANUAL",
      status: "PENDING_PAYMENT",
      transactionReference: paymentReference(),
    },
    include: { package: true },
  });
  return {
    payment: publicPaymentView(payment),
    stubAllowed: managedTestingStubPaymentsAllowed(),
    payee: manualPayeeInstructions(),
  };
}

export async function getPaymentForUser(userId: string, publicId: string) {
  const view = await getPaymentCheckoutForUser(userId, publicId);
  return {
    ...view,
    stubAllowed: false,
    payee: manualPayeeInstructions(),
    revenueCatConfigured: view.methods.some((item) => item.id === "REVENUECAT" && item.available),
  };
}

export async function getPaymentCheckoutForUser(userId: string, publicId: string) {
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId, userId },
    include: {
      package: true,
      campaign: { select: { publicId: true, status: true } },
      user: { select: { email: true, name: true, developerName: true } },
    },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  return {
    payment: publicPaymentView(payment),
    campaignPublicId: payment.campaign?.publicId ?? null,
    methods: paymentMethods(),
    whatsapp: PAYMENT_PROOF_WHATSAPP,
    developerEmail: payment.user.email,
    developerName: payment.user.developerName || payment.user.name || payment.user.email,
    canSubmitProof: paymentCanSubmitProof(payment.status),
    activated: paymentIsActivated(payment.status),
  };
}

export async function confirmStubPayment(userId: string, publicId: string) {
  if (!managedTestingStubPaymentsAllowed()) {
    throw new AppError("This payment cannot be confirmed here.", 403, "PAYMENT_PROVIDER");
  }
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId, userId },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  return markPaymentPaid(payment.id, "STUB");
}

export async function adminMarkPaymentPaid(paymentPublicId: string, adminUserId?: string) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: paymentPublicId },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  return markPaymentPaid(payment.id, "MANUAL", adminUserId);
}

export async function adminMarkPaymentFailed(paymentPublicId: string) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: paymentPublicId },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (paymentIsActivated(payment.status)) throw new AppError("Approved packages cannot be marked failed.");
  return prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });
}

export async function activateManagedPaymentFromPaddle(paymentId: string, paddleTransactionId: string) {
  const owner = await prisma.managedTestingPayment.findUnique({
    where: { paddleTransactionId },
    select: { id: true },
  });
  if (owner && owner.id !== paymentId) {
    throw new AppError("This Paddle transaction is already attached to another payment.");
  }
  try {
    await prisma.managedTestingPayment.update({
      where: { id: paymentId },
      data: { paddleTransactionId, provider: "PADDLE" },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "P2002") {
      const taken = await prisma.managedTestingPayment.findUnique({
        where: { paddleTransactionId },
        select: { id: true },
      });
      if (!taken || taken.id !== paymentId) {
        throw new AppError("This Paddle transaction is already attached to another payment.");
      }
    } else {
      throw error;
    }
  }
  return markPaymentPaid(paymentId, "PADDLE");
}

async function markPaymentPaid(paymentId: string, provider: "STUB" | "MANUAL" | "PADDLE", reviewerId?: string) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { id: paymentId },
    include: { package: true, campaign: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (paymentIsActivated(payment.status) && payment.campaign) {
    if (isUsdTwelvePackage(payment.package.code) && payment.campaign.status !== "COMPLETED") {
      await fulfillUsdTwelvePackage(payment.id);
    }
    return { campaignPublicId: payment.campaign.publicId, alreadyPaid: true as const };
  }
  if (paymentIsActivated(payment.status)) {
    const campaign = await createDraftCampaign(payment);
    if (isUsdTwelvePackage(payment.package.code)) {
      await fulfillUsdTwelvePackage(payment.id);
    }
    return { campaignPublicId: campaign.publicId, alreadyPaid: true as const };
  }
  if (
    payment.status !== "PENDING" &&
    payment.status !== "PENDING_PAYMENT" &&
    payment.status !== "PROOF_SUBMITTED" &&
    payment.status !== "UNDER_REVIEW"
  ) {
    throw new AppError("This payment is not awaiting confirmation.");
  }
  const updated = await prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: {
      status: "APPROVED",
      paidAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      provider: provider === "STUB" ? "STUB" : provider === "PADDLE" ? "PADDLE" : payment.provider,
      confirmTokenUsedAt: payment.confirmTokenUsedAt ?? new Date(),
    },
    include: { package: true },
  });
  const campaign = await createDraftCampaign(updated);
  if (isUsdTwelvePackage(updated.package.code)) {
    const fulfilled = await fulfillUsdTwelvePackage(updated.id);
    const href = `/managed-testing/${fulfilled?.campaignPublicId || campaign.publicId}`;
    const campaignLink = `${env.appUrl.replace(/\/$/, "")}${href}`;
    const approvedMail = usdTwelveDeveloperActivatedEmail({
      packageName: payment.package.name,
      amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
      campaignUrl: campaignLink,
      transactionReference: payment.transactionReference,
      confirmedAt: formatDateTime(updated.paidAt || new Date()),
    });
    await notifyDeveloper(payment.userId, {
      type: "managed_payment_paid",
      eventKey: `managed_paid:${payment.id}`,
      title: "Payment confirmed · testing package active",
      body: `${payment.package.name} is active. Payment confirmed and 12 testers are being invited.`,
      href,
    });
    const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
    if (user?.email) {
      await sendSmtpEmail({ to: user.email, ...approvedMail });
    }
    await logActivity({
      userId: payment.userId,
      action: "managed_payment_confirmed",
      result: "ok",
      metadata: {
        paymentPublicId: payment.publicId,
        transactionReference: payment.transactionReference,
        confirmedAt: (updated.paidAt || new Date()).toISOString(),
        packageCode: updated.package.code,
      },
    });
    return { campaignPublicId: fulfilled?.campaignPublicId || campaign.publicId, alreadyPaid: false as const };
  }
  const setupUrl = `${env.appUrl.replace(/\/$/, "")}/managed-testing/${campaign.publicId}/setup`;
  const approvedMail = developerPaymentApprovedEmail({
    packageName: payment.package.name,
    testerCount: payment.package.testerCount,
    amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
    setupUrl,
  });
  await notifyDeveloper(payment.userId, {
    type: "managed_payment_paid",
    eventKey: `managed_paid:${payment.id}`,
    title: "Managed testing package ready",
    body: `${payment.package.name} is ready. Create your testing campaign to continue.`,
    href: `/managed-testing/${campaign.publicId}/setup`,
  });
  const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
  if (user?.email) {
    await sendSmtpEmail({ to: user.email, ...approvedMail });
  }
  return { campaignPublicId: campaign.publicId, alreadyPaid: false as const };
}

async function createDraftCampaign(payment: {
  id: string;
  userId: string;
  package: { testerCount: number };
  campaign?: { publicId: string } | null;
}) {
  if (payment.campaign) {
    return prisma.managedTestingCampaign.findUniqueOrThrow({ where: { paymentId: payment.id } });
  }
  return prisma.managedTestingCampaign.create({
    data: {
      publicId: publicCampaignId(),
      userId: payment.userId,
      paymentId: payment.id,
      testerTarget: payment.package.testerCount,
      durationDays: MANAGED_TESTING_DURATION_DAYS,
      status: "DRAFT",
    },
  });
}

function publicPaymentView(payment: {
  publicId: string;
  amountPkr: number;
  currency: string;
  status: ManagedPaymentStatus;
  provider: string;
  method?: PaymentMethodId | null;
  transactionReference: string;
  developerReference?: string | null;
  proofMime?: string | null;
  proofFileName?: string | null;
  proofUploadedAt?: Date | null;
  submittedAt?: Date | null;
  adminNote?: string | null;
  paidAt: Date | null;
  createdAt: Date;
  package: { code: string; name: string; testerCount: number; amountPkr: number; contactOnly: boolean };
  campaign?: { publicId: string; status: string } | null;
}) {
  const method = paymentMethodById(payment.method);
  return {
    publicId: payment.publicId,
    amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
    amountPkr: payment.amountPkr,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    method: payment.method ?? null,
    methodLabel: payment.provider === "PADDLE" ? "Paddle" : method?.label ?? null,
    transactionReference: payment.transactionReference,
    developerReference: payment.developerReference ?? null,
    hasProof: Boolean(payment.proofMime),
    proofFileName: payment.proofFileName ?? null,
    proofUploadedAt: payment.proofUploadedAt?.toISOString() ?? null,
    submittedAt: payment.submittedAt?.toISOString() ?? null,
    adminNote: payment.status === "REJECTED" ? payment.adminNote ?? null : null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    packageCode: payment.package.code,
    packageName: payment.package.name,
    testerCount: payment.package.testerCount,
    campaignPublicId: payment.campaign?.publicId ?? null,
    campaignStatus: payment.campaign?.status ?? null,
    active: paymentIsActivated(payment.status),
    paddleCheckout: payment.provider === "PADDLE",
  };
}

export async function selectPaymentMethod(userId: string, publicId: string, methodId: string) {
  const method = paymentMethodById(methodId);
  if (!method) throw new AppError("Choose a payment method.");
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId, userId },
    include: { package: true, campaign: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (!paymentCanSubmitProof(payment.status)) {
    throw new AppError("This payment can no longer change method.");
  }
  if (!method.available) {
    throw new AppError(method.unavailableReason || "That payment method is not available.");
  }
  const updated = await prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: {
      method: method.id,
      provider: providerForMethod(method.id),
    },
    include: { package: true, campaign: true },
  });
  return publicPaymentView(updated);
}

export async function submitPaymentProof(input: {
  userId: string;
  publicId: string;
  methodId: string;
  developerReference?: string | null;
  file: { type: string; size: number; name: string; bytes: Buffer };
}) {
  const method = paymentMethodById(input.methodId);
  if (!method) throw new AppError("Choose a payment method.");
  if (!method.available) {
    throw new AppError(method.unavailableReason || "That payment method is not available.");
  }
  const valid = validatePaymentProof(input.file);
  if (!valid.ok) throw new AppError(valid.error);
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId: input.publicId, userId: input.userId },
    include: {
      package: true,
      user: { select: { email: true, name: true, developerName: true } },
    },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (!paymentCanSubmitProof(payment.status)) {
    throw new AppError("This payment is already under review or approved.");
  }
  const submittedAt = new Date();
  const usdTwelve = isUsdTwelvePackage(payment.package.code);
  const issued = usdTwelve ? issuePaymentConfirmToken(payment.publicId) : null;
  const updated = await prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: {
      method: method.id,
      provider: providerForMethod(method.id),
      developerReference: input.developerReference?.trim().slice(0, 120) || null,
      proofBytes: Uint8Array.from(input.file.bytes),
      proofMime: valid.mime,
      proofFileName: input.file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || `proof.${valid.mime.split("/")[1] || "bin"}`,
      proofUploadedAt: submittedAt,
      submittedAt,
      status: "UNDER_REVIEW",
      adminNote: null,
      reviewedAt: null,
      reviewedById: null,
      confirmTokenHash: issued?.nonceHash ?? null,
      confirmTokenExpiresAt: issued?.expiresAt ?? null,
      confirmTokenUsedAt: null,
    },
    include: { package: true, campaign: true },
  });
  const origin = env.appUrl.replace(/\/$/, "");
  const attachments = [
    {
      filename: updated.proofFileName || "payment-proof",
      content: input.file.bytes,
      contentType: valid.mime,
    },
  ];
  if (usdTwelve && issued) {
    const fulfillment = parseUsdTwelveFulfillment(payment.fulfillment);
    const app = fulfillment
      ? await prisma.app.findFirst({ where: { id: fulfillment.appId, userId: payment.userId }, select: { name: true } })
      : null;
    const mail = usdTwelveAdminProofReviewEmail({
      developerName: payment.user.developerName || payment.user.name || payment.user.email,
      developerEmail: payment.user.email,
      appName: app?.name || "App",
      amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
      methodLabel: method.label,
      transactionReference: payment.transactionReference,
      submittedAt: formatDateTime(submittedAt),
      confirmUrl: `${origin}/admin/managed-testing/confirm-payment?token=${encodeURIComponent(issued.token)}`,
      hasProof: true,
    });
    await sendSmtpEmail({
      to: PAYMENTS_ADMIN_EMAIL,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments,
    });
  } else {
    const reviewUrl = `${origin}/admin/managed-testing/payments/${updated.publicId}`;
    const mail = adminPaymentReviewEmail({
      developerName: payment.user.developerName || payment.user.name || payment.user.email,
      developerEmail: payment.user.email,
      packageName: payment.package.name,
      testerCount: payment.package.testerCount,
      amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
      methodLabel: method.label,
      transactionReference: payment.transactionReference,
      developerReference: updated.developerReference,
      submittedAt: submittedAt.toISOString(),
      reviewUrl,
      statusLabel: "Payment under review",
      hasProof: true,
    });
    await sendSmtpEmail({
      to: PAYMENTS_ADMIN_EMAIL,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments,
    });
  }
  await notifyDeveloper(input.userId, {
    type: "managed_payment_submitted",
    eventKey: `managed_proof:${payment.id}:${submittedAt.toISOString()}`,
    title: "Payment under review",
    body: `TestLoop received your ${payment.package.name} payment proof. The package stays inactive until an administrator approves it.`,
    href: `/managed-testing/payments/${payment.publicId}`,
  });
  return publicPaymentView(updated);
}

export async function adminApprovePayment(input: {
  adminUserId: string;
  paymentPublicId: string;
  adminNote?: string | null;
}) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: input.paymentPublicId },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (input.adminNote?.trim()) {
    await prisma.managedTestingPayment.update({
      where: { id: payment.id },
      data: { adminNote: input.adminNote.trim().slice(0, 2000) },
    });
  }
  return markPaymentPaid(payment.id, "MANUAL", input.adminUserId);
}

export async function adminRejectPayment(input: {
  adminUserId: string;
  paymentPublicId: string;
  adminNote: string;
}) {
  const note = input.adminNote.trim();
  if (!note) throw new AppError("Add a note explaining the rejection.");
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: input.paymentPublicId },
    include: { package: true, user: { select: { email: true } } },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (paymentIsActivated(payment.status)) throw new AppError("Approved packages cannot be rejected.");
  if (!paymentNeedsReview(payment.status) && payment.status !== "PENDING" && payment.status !== "PENDING_PAYMENT") {
    throw new AppError("This payment is not waiting for review.");
  }
  await prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: {
      status: "REJECTED",
      adminNote: note.slice(0, 2000),
      reviewedAt: new Date(),
      reviewedById: input.adminUserId,
    },
  });
  const retryUrl = `${env.appUrl.replace(/\/$/, "")}/managed-testing/payments/${payment.publicId}`;
  const mail = developerPaymentRejectedEmail({
    packageName: payment.package.name,
    amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
    note,
    retryUrl,
  });
  if (payment.user.email) {
    await sendSmtpEmail({ to: payment.user.email, ...mail });
  }
  await notifyDeveloper(payment.userId, {
    type: "managed_payment_rejected",
    eventKey: `managed_rejected:${payment.id}:${Date.now()}`,
    title: "Payment not approved",
    body: `TestLoop could not approve ${payment.package.name}. ${note}`,
    href: `/managed-testing/payments/${payment.publicId}`,
  });
  return { ok: true as const };
}

export async function getPaymentProof(input: { publicId: string; userId: string; admin: boolean }) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: input.publicId },
    select: { userId: true, proofBytes: true, proofMime: true, proofFileName: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (!input.admin && payment.userId !== input.userId) throw new NotFoundError("Payment not found.");
  if (!payment.proofBytes || !payment.proofMime) throw new NotFoundError("No payment proof uploaded.");
  return {
    mime: payment.proofMime,
    filename: payment.proofFileName || "payment-proof",
    bytes: Buffer.from(payment.proofBytes),
  };
}

export async function adminGetPayment(publicId: string) {
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId },
    include: {
      package: true,
      campaign: { select: { publicId: true, status: true, testerTarget: true, _count: { select: { assignments: true } } } },
      user: { select: { email: true, name: true, developerName: true } },
      reviewedBy: { select: { email: true, name: true } },
    },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  return {
    payment: {
      ...publicPaymentView(payment),
      adminNote: payment.adminNote,
      reviewedAt: payment.reviewedAt?.toISOString() ?? null,
      reviewerEmail: payment.reviewedBy?.email ?? null,
      needsReview: paymentNeedsReview(payment.status),
    },
    developer: {
      name: payment.user.developerName || payment.user.name || payment.user.email,
      email: payment.user.email,
    },
    campaign: payment.campaign,
  };
}

export async function listDeveloperPayments(userId: string) {
  const payments = await prisma.managedTestingPayment.findMany({
    where: { userId },
    include: { package: true, campaign: { select: { publicId: true, status: true, testerTarget: true, _count: { select: { assignments: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const views = payments.map(publicPaymentView);
  const active = payments.find((row) => paymentIsActivated(row.status) && row.campaign && ["DRAFT", "READY", "ACTIVE"].includes(row.campaign.status));
  const allocated = payments
    .filter((row) => paymentIsActivated(row.status))
    .reduce((sum, row) => sum + row.package.testerCount, 0);
  const used = payments.reduce((sum, row) => sum + (row.campaign?._count.assignments ?? 0), 0);
  return {
    payments: views,
    activePackage: active
      ? {
          packageName: active.package.name,
          testerCount: active.package.testerCount,
          campaignPublicId: active.campaign?.publicId ?? null,
          campaignStatus: active.campaign?.status ?? null,
          assigned: active.campaign?._count.assignments ?? 0,
          remaining: Math.max(0, (active.campaign?.testerTarget ?? active.package.testerCount) - (active.campaign?._count.assignments ?? 0)),
        }
      : null,
    allocation: { purchased: allocated, assigned: used, remaining: Math.max(0, allocated - used) },
  };
}

async function ownedCampaign(userId: string, publicId: string) {
  const campaign = await prisma.managedTestingCampaign.findFirst({
    where: { publicId, userId },
    include: {
      app: { select: { id: true, name: true, iconUrl: true, webOptInUrl: true, playStoreUrl: true } },
      payment: { include: { package: true } },
      assignments: {
        include: { tester: true, confirmation: { select: { id: true, confirmedSetup: true, screenshotMime: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return campaign;
}

export async function getManagedCampaignForUser(userId: string, publicId: string) {
  const campaign = await ownedCampaign(userId, publicId);
  return toDashboardView(campaign);
}

export async function listSelectableApps(userId: string) {
  const apps = await prisma.app.findMany({
    where: { userId },
    select: { id: true, name: true, iconUrl: true, testingType: true, webOptInUrl: true, syncedFromPlay: true },
    orderBy: { name: "asc" },
  });
  return apps.map((app) => ({
    id: app.id,
    name: app.name,
    iconUrl: app.iconUrl,
    testingType: app.testingType,
    hasTestingLink: Boolean(app.webOptInUrl),
    playConnected: app.syncedFromPlay,
  }));
}

export async function saveManagedCampaignSetup(
  userId: string,
  publicId: string,
  input: {
    appId: string;
    testingType: TestingType;
    testingUrl?: string | null;
    testingInstructions?: string | null;
  },
) {
  const campaign = await ownedCampaign(userId, publicId);
  if (isUsdTwelvePackage(campaign.payment.package.code)) {
    throw new AppError("This package is configured at purchase and cannot be edited.");
  }
  if (!paymentIsActivated(campaign.payment.status)) {
    throw new AppError("Payment must be confirmed before creating a campaign.");
  }
  if (campaign.status === "ACTIVE" || campaign.status === "COMPLETED") {
    throw new AppError("This campaign can no longer be edited.");
  }
  const app = await prisma.app.findFirst({
    where: { id: input.appId, userId },
    select: { id: true, name: true, webOptInUrl: true },
  });
  if (!app) throw new AppError("Select one of your apps.");
  const validated = validateManagedCampaignSetup({
    testingType: input.testingType,
    testingUrl: input.testingUrl || app.webOptInUrl,
    testingInstructions: input.testingInstructions,
  });
  if (!validated.ok) throw new AppError(validated.error);
  const updated = await prisma.managedTestingCampaign.update({
    where: { id: campaign.id },
    data: {
      appId: app.id,
      testingType: input.testingType,
      testingUrl: validated.testingUrl,
      testingInstructions: validated.testingInstructions,
      status: "READY",
    },
  });
  return { publicId: updated.publicId };
}

export async function startManagedCampaign(userId: string, publicId: string) {
  const campaign = await ownedCampaign(userId, publicId);
  if (isUsdTwelvePackage(campaign.payment.package.code)) {
    throw new AppError("This package starts automatically after payment is approved.");
  }
  if (!paymentIsActivated(campaign.payment.status)) throw new AppError("Payment is not confirmed.");
  if (campaign.status === "ACTIVE") return toDashboardView(campaign);
  if (campaign.status !== "READY" && campaign.status !== "DRAFT") {
    throw new AppError("This campaign cannot be started.");
  }
  if (!campaign.appId || !campaign.testingUrl) {
    throw new AppError("Select an app and testing link before starting.");
  }
  const now = new Date();
  const started = await prisma.managedTestingCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "ACTIVE",
      startedAt: now,
      endsAt: new Date(now.getTime() + campaign.durationDays * 86_400_000),
    },
  });
  const assigned = await assignConsentingTesters(started.id, started.testerTarget);
  await sendAssignmentInvites(started.id);
  await notifyDeveloper(userId, {
    type: "managed_campaign_started",
    eventKey: `managed_started:${started.id}`,
    title: "Managed testing campaign started",
    body: `${appNameOf(campaign)} is now coordinating ${assigned} consenting tester${assigned === 1 ? "" : "s"}.`,
    href: `/managed-testing/${started.publicId}`,
  });
  return getManagedCampaignForUser(userId, publicId);
}

async function assignConsentingTesters(campaignId: string, needed: number) {
  const already = await prisma.managedCampaignTester.findMany({
    where: { campaignId },
    select: { testerId: true },
  });
  const remaining = Math.max(0, needed - already.length);
  if (remaining === 0) return already.length;
  const pool = await prisma.managedTester.findMany({
    where: {
      consentStatus: "CONSENTED",
      availableForTesting: true,
      currentlyAssigned: false,
      reservedPackageCode: null,
      id: { notIn: already.map((row) => row.testerId) },
    },
    orderBy: { createdAt: "asc" },
    take: remaining,
  });
  let index = already.length;
  for (const tester of pool) {
    const token = randomToken(32);
    await prisma.$transaction([
      prisma.managedCampaignTester.create({
        data: {
          publicId: publicAssignmentId(),
          campaignId,
          testerId: tester.id,
          displayLabel: testerDisplayLabel(index),
          testingStatus: "INVITED",
          inviteTokenHash: sha256(token),
          inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedAt: new Date(),
        },
      }),
      prisma.managedTester.update({
        where: { id: tester.id },
        data: { currentlyAssigned: true },
      }),
    ]);
    await storeInviteToken(campaignId, tester.id, token);
    index += 1;
  }
  return already.length + pool.length;
}

/** Keep plaintext token only in memory for the email send that follows. */
const pendingInviteTokens = new Map<string, string>();

async function storeInviteToken(campaignId: string, testerId: string, token: string) {
  pendingInviteTokens.set(`${campaignId}:${testerId}`, token);
}

async function sendAssignmentInvites(campaignId: string) {
  const campaign = await prisma.managedTestingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      app: { select: { name: true } },
      user: { select: { developerName: true, name: true } },
      assignments: { include: { tester: true } },
    },
  });
  if (!campaign?.testingUrl) return;
  const developerName = campaign.user.developerName || campaign.user.name || "A TestLoop developer";
  for (const assignment of campaign.assignments) {
    if (assignment.invitationStatus === "SENT") continue;
    let token = pendingInviteTokens.get(`${campaignId}:${assignment.testerId}`);
    if (!token) {
      token = randomToken(32);
      await prisma.managedCampaignTester.update({
        where: { id: assignment.id },
        data: {
          inviteTokenHash: sha256(token),
          inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });
    }
    pendingInviteTokens.delete(`${campaignId}:${assignment.testerId}`);
    const template = managedTesterInviteEmail({
      testerName: assignment.tester.name,
      appName: appNameOf(campaign),
      testingTypeLabel: testingTypeLabel(campaign.testingType),
      developerName,
      joinUrl: campaign.testingUrl,
      confirmUrl: confirmUrl(token),
    });
    const sent = await sendSmtpEmail({
      to: assignment.tester.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    await prisma.emailEvent.create({
      data: {
        userId: campaign.userId,
        type: "managed_tester_invite",
        toAddress: assignment.tester.email,
        subject: template.subject,
        status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
        error: sent.ok ? null : sent.error,
        eventKey: `managed_invite:${assignment.id}:${sent.ok ? "sent" : Date.now()}`,
      },
    });
    await prisma.managedCampaignTester.update({
      where: { id: assignment.id },
      data: {
        invitationStatus: sent.ok ? "SENT" : "FAILED",
        testingStatus: sent.ok ? "EMAIL_SENT" : assignment.testingStatus,
        emailSentAt: sent.ok ? new Date() : null,
      },
    });
  }
  const sentCount = campaign.assignments.length;
  await notifyDeveloper(campaign.userId, {
    type: "managed_invites_sent",
    eventKey: `managed_invites:${campaign.id}`,
    title: "Tester invitations sent",
    body: `${sentCount} invitation${sentCount === 1 ? "" : "s"} sent for ${appNameOf(campaign)}.`,
    href: `/managed-testing/${campaign.publicId}`,
  });
}

export async function sendManagedReminder(userId: string, publicId: string, assignmentPublicId: string) {
  const campaign = await ownedCampaign(userId, publicId);
  const assignment = campaign.assignments.find((row) => row.publicId === assignmentPublicId);
  if (!assignment) throw new NotFoundError("Tester not found.");
  if (assignment.confirmationStatus === "CONFIRMED") {
    throw new AppError("This tester has already confirmed.");
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emailEvent.count({
    where: {
      userId,
      type: "managed_tester_reminder",
      toAddress: assignment.tester.email,
      createdAt: { gte: hourAgo },
    },
  });
  if (recent >= 2) throw new RateLimitError("Wait before sending another reminder.");
  const token = randomToken(32);
  await prisma.managedCampaignTester.update({
    where: { id: assignment.id },
    data: {
      inviteTokenHash: sha256(token),
      inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  const template = managedTesterReminderEmail({
    testerName: assignment.tester.name,
    appName: appNameOf(campaign),
    joinUrl: campaign.testingUrl || env.appUrl,
    confirmUrl: confirmUrl(token),
  });
  const sent = await sendSmtpEmail({
    to: assignment.tester.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
  await prisma.emailEvent.create({
    data: {
      userId,
      type: "managed_tester_reminder",
      toAddress: assignment.tester.email,
      subject: template.subject,
      status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
      error: sent.ok ? null : sent.error,
    },
  });
  if (!sent.ok) throw new AppError(sent.error);
  return { ok: true as const };
}

export async function loadJoinPage(token: string) {
  const hash = sha256(token.trim());
  const assignment = await prisma.managedCampaignTester.findFirst({
    where: {
      inviteTokenHash: hash,
      inviteTokenExpiresAt: { gt: new Date() },
    },
    include: {
      tester: { select: { name: true } },
      campaign: { include: { app: { select: { name: true } } } },
    },
  });
  if (!assignment) throw new AppError("This invitation link is invalid or has expired.");
  if (assignment.testingStatus === "EMAIL_SENT" || assignment.testingStatus === "INVITED") {
    await prisma.managedCampaignTester.update({
      where: { id: assignment.id },
      data: { testingStatus: "EMAIL_OPENED" },
    });
  }
  return {
    testerName: assignment.tester.name,
    appName: appNameOf(assignment.campaign),
    testingTypeLabel: testingTypeLabel(assignment.campaign.testingType),
    joinUrl: assignment.campaign.testingUrl,
    alreadyConfirmed: assignment.confirmationStatus === "CONFIRMED",
    instructions: assignment.campaign.testingInstructions,
  };
}

export async function confirmManagedParticipation(
  token: string,
  screenshot?: { mime: string; bytes: Buffer } | null,
) {
  const hash = sha256(token.trim());
  const assignment = await prisma.managedCampaignTester.findFirst({
    where: {
      inviteTokenHash: hash,
      inviteTokenExpiresAt: { gt: new Date() },
    },
    include: { campaign: { include: { app: { select: { name: true } } } }, tester: true },
  });
  if (!assignment) throw new AppError("This invitation link is invalid or has expired.");
  if (screenshot) {
    if (!SCREENSHOT_TYPES.has(screenshot.mime)) throw new AppError("Upload a JPEG, PNG, or WebP screenshot.");
    if (screenshot.bytes.length > SCREENSHOT_MAX_BYTES) throw new AppError("Screenshot must be under 400 KB.");
  }
  const screenshotBytes = screenshot ? Uint8Array.from(screenshot.bytes) : null;
  await prisma.$transaction([
    prisma.managedCampaignTester.update({
      where: { id: assignment.id },
      data: {
        testingStatus: "CONFIRMED",
        optInStatus: "JOINED",
        confirmationStatus: "CONFIRMED",
        optedInAt: assignment.optedInAt ?? new Date(),
        confirmedAt: new Date(),
        inviteTokenHash: null,
        inviteTokenExpiresAt: null,
      },
    }),
    prisma.managedTesterConfirmation.upsert({
      where: { assignmentId: assignment.id },
      update: {
        confirmedSetup: true,
        screenshotMime: screenshot?.mime ?? undefined,
        screenshotBytes: screenshotBytes ?? undefined,
      },
      create: {
        assignmentId: assignment.id,
        confirmedSetup: true,
        screenshotMime: screenshot?.mime ?? null,
        screenshotBytes: screenshotBytes,
      },
    }),
    prisma.managedTester.update({
      where: { id: assignment.testerId },
      data: { campaignsTested: { increment: 1 } },
    }),
  ]);
  await notifyDeveloper(assignment.campaign.userId, {
    type: "managed_tester_confirmed",
    eventKey: `managed_confirmed:${assignment.id}`,
    title: "Tester confirmed participation",
    body: `${assignment.displayLabel} confirmed setup for ${appNameOf(assignment.campaign)}.`,
    href: `/managed-testing/${assignment.campaign.publicId}`,
  });
  return { ok: true as const, appName: appNameOf(assignment.campaign) };
}

export async function saveCampaignReportPrefs(
  userId: string,
  publicId: string,
  input: {
    reportEmailEnabled?: boolean;
    reportFrequency?: ManagedReportFrequency;
    reportTime?: string;
    reportTimezone?: string;
    whatsappNumber?: string | null;
  },
) {
  const campaign = await ownedCampaign(userId, publicId);
  const number = input.whatsappNumber?.trim() || null;
  if (number && !/^\+?[0-9]{10,15}$/.test(number.replace(/[\s-]/g, ""))) {
    throw new AppError("Enter a valid WhatsApp number with country code.");
  }
  await prisma.managedTestingCampaign.update({
    where: { id: campaign.id },
    data: {
      reportEmailEnabled: input.reportEmailEnabled ?? campaign.reportEmailEnabled,
      reportFrequency: input.reportFrequency ?? campaign.reportFrequency,
      reportTime: parseNotificationTime(input.reportTime ?? campaign.reportTime),
      reportTimezone: resolveTimeZone(input.reportTimezone ?? campaign.reportTimezone),
      whatsappNumber: number,
      whatsappVerified: number ? false : false,
    },
  });
  return getManagedCampaignForUser(userId, publicId);
}

export async function exportCampaignReportCsv(userId: string, publicId: string) {
  const campaign = await ownedCampaign(userId, publicId);
  const usd = isUsdTwelvePackage(campaign.payment.package.code);
  const lines = [
    usd
      ? ["Tester", "Invitation", "Confirmation", "Status", "Screenshot"].join(",")
      : ["Tester", "Play email", "Invitation", "Opt-in", "Confirmation", "Status"].join(","),
    ...campaign.assignments.map((row) =>
      usd
        ? [
            csv(row.displayLabel),
            csv(row.invitationStatus),
            csv(row.confirmationStatus === "CONFIRMED" ? "Tester confirmed testing" : "Pending"),
            csv(row.testingStatus),
            csv(row.confirmation?.screenshotMime ? "Received" : "None"),
          ].join(",")
        : [
            csv(row.displayLabel),
            csv(row.tester.googleAccountEmail || row.tester.email),
            csv(row.invitationStatus),
            csv(row.optInStatus),
            csv(row.confirmationStatus),
            csv(row.testingStatus),
          ].join(","),
    ),
  ];
  return {
    filename: `${appNameOf(campaign).replace(/[^\w]+/g, "-")}-managed-testing.csv`,
    csv: lines.join("\n"),
  };
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function getAssignmentScreenshot(userId: string, assignmentPublicId: string) {
  const assignment = await prisma.managedCampaignTester.findFirst({
    where: { publicId: assignmentPublicId, campaign: { userId } },
    include: { confirmation: true, campaign: { include: { payment: { include: { package: true } } } } },
  });
  if (!assignment?.confirmation?.screenshotBytes) throw new NotFoundError("No screenshot uploaded.");
  if (isUsdTwelvePackage(assignment.campaign.payment.package.code)) {
    throw new NotFoundError("No screenshot uploaded.");
  }
  return {
    mime: assignment.confirmation.screenshotMime || "image/jpeg",
    bytes: Buffer.from(assignment.confirmation.screenshotBytes),
  };
}

function toDashboardView(
  campaign: Awaited<ReturnType<typeof ownedCampaign>>,
) {
  const assigned = campaign.assignments.length;
  const invitationsSent = campaign.assignments.filter((row) => row.invitationStatus === "SENT").length;
  const optedIn = campaign.assignments.filter((row) => row.optInStatus === "JOINED").length;
  const confirmed = campaign.assignments.filter((row) => row.confirmationStatus === "CONFIRMED").length;
  const pending = Math.max(0, assigned - confirmed);
  const progress = campaignDayProgress(campaign.startedAt, campaign.durationDays);
  return {
    publicId: campaign.publicId,
    paymentPublicId: campaign.payment.publicId,
    status: campaign.status,
    testingType: campaign.testingType,
    testerTarget: campaign.testerTarget,
    durationDays: campaign.durationDays,
    testingUrl: campaign.testingUrl,
    testingInstructions: campaign.testingInstructions,
    app: campaign.app ? { name: campaign.app.name, iconUrl: campaign.app.iconUrl } : null,
    packageName: campaign.payment.package.name,
    packageCode: campaign.payment.package.code,
    testerCount: campaign.payment.package.testerCount,
    paymentStatus: campaign.payment.status,
    amountLabel: formatPackageAmount(campaign.payment.amountPkr, campaign.payment.currency),
    startedAt: campaign.startedAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
    progress,
    stats: { assigned, invitationsSent, optedIn, confirmed, pending, recruiting: Math.max(0, campaign.testerTarget - assigned) },
    reportEmailEnabled: campaign.reportEmailEnabled,
    reportFrequency: campaign.reportFrequency,
    reportTime: campaign.reportTime,
    reportTimezone: campaign.reportTimezone,
    whatsappNumber: campaign.whatsappNumber,
    whatsappVerified: campaign.whatsappVerified,
    whatsappAvailable: whatsappReportingConfigured(),
    testers: campaign.assignments.map((row) => ({
      publicId: row.publicId,
      label: row.displayLabel,
      name: row.tester.name,
      playEmail: isUsdTwelvePackage(campaign.payment.package.code)
        ? ""
        : row.tester.googleAccountEmail || row.tester.email,
      invitationStatus: row.invitationStatus,
      optInStatus: row.optInStatus,
      confirmationStatus: row.confirmationStatus,
      testingStatus: row.testingStatus,
      hasScreenshot: Boolean(row.confirmation?.screenshotMime),
    })),
    timeline: buildTimeline(campaign, progress, { assigned, invitationsSent, optedIn, confirmed }),
  };
}

function buildTimeline(
  campaign: { status: string; startedAt: Date | null; durationDays: number },
  progress: { day: number; durationDays: number },
  stats: { assigned: number; invitationsSent: number; optedIn: number; confirmed: number },
) {
  const started = Boolean(campaign.startedAt);
  return [
    { label: `Day ${started ? progress.day : 0} / ${campaign.durationDays}`, done: started },
    { label: "Campaign started", done: started },
    { label: "Invitations sent", done: stats.invitationsSent > 0 },
    { label: "Tester participation", done: stats.assigned > 0 },
    { label: "Opt-in progress", done: stats.optedIn > 0 },
    { label: "Confirmation progress", done: stats.confirmed > 0 },
    { label: "Campaign completed", done: campaign.status === "COMPLETED" },
  ];
}

export async function expireManagedCampaigns(now = new Date()) {
  const due = await prisma.managedTestingCampaign.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    include: { assignments: true, app: { select: { name: true } } },
  });
  for (const campaign of due) {
    await prisma.managedTestingCampaign.update({
      where: { id: campaign.id },
      data: { status: "COMPLETED", completedAt: now },
    });
    for (const assignment of campaign.assignments) {
      await prisma.managedCampaignTester.update({
        where: { id: assignment.id },
        data: {
          testingStatus:
            assignment.confirmationStatus === "CONFIRMED" ? "COMPLETED" : "EXPIRED",
        },
      });
      await prisma.managedTester.update({
        where: { id: assignment.testerId },
        data: { currentlyAssigned: false },
      });
    }
    await notifyDeveloper(campaign.userId, {
      type: "managed_campaign_completed",
      eventKey: `managed_completed:${campaign.id}`,
      title: "Managed testing campaign completed",
      body: `${appNameOf(campaign)} has reached the end of its testing period.`,
      href: `/managed-testing/${campaign.publicId}`,
    });
    await sendCampaignReport(campaign.id, "completion", now);
  }
  return { completed: due.length };
}

export async function sendManagedTestingReports(now = new Date()) {
  await expireManagedCampaigns(now);
  const campaigns = await prisma.managedTestingCampaign.findMany({
    where: { status: "ACTIVE", reportEmailEnabled: true, reportFrequency: { in: ["DAILY", "WEEKLY"] } },
  });
  let sent = 0;
  for (const campaign of campaigns) {
    const frequency = campaign.reportFrequency === "WEEKLY" ? "weekly" : "daily";
    const due = isScheduledSendDue(now, {
      frequency,
      time: campaign.reportTime,
      timezone: campaign.reportTimezone,
      weekday: campaign.reportWeekday,
    });
    if (!due) continue;
    const ok = await sendCampaignReport(campaign.id, frequency, now);
    if (ok) sent += 1;
  }
  return { sent };
}

async function sendCampaignReport(campaignId: string, kind: "daily" | "weekly" | "completion", now: Date) {
  const campaign = await prisma.managedTestingCampaign.findUnique({
    where: { id: campaignId },
    include: { app: { select: { name: true } }, assignments: true },
  });
  if (!campaign) return false;
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: campaign.reportTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const periodKey = `${kind}:${local}`;
  const existing = await prisma.managedTestingReport.findUnique({
    where: { campaignId_periodKey: { campaignId, periodKey } },
  });
  if (existing) return false;
  const assigned = campaign.assignments.length;
  const invitationsSent = campaign.assignments.filter((row) => row.invitationStatus === "SENT").length;
  const optedIn = campaign.assignments.filter((row) => row.optInStatus === "JOINED").length;
  const confirmed = campaign.assignments.filter((row) => row.confirmationStatus === "CONFIRMED").length;
  const pending = Math.max(0, assigned - confirmed);
  const progress = campaignDayProgress(campaign.startedAt, campaign.durationDays, now);
  const snapshot = { assigned, invitationsSent, optedIn, confirmed, pending, day: progress.day };
  try {
    await prisma.managedTestingReport.create({
      data: { campaignId, periodKey, kind, snapshot },
    });
  } catch {
    return false;
  }
  const template = managedTestingDailyReportEmail({
    appName: appNameOf(campaign),
    day: progress.day,
    durationDays: campaign.durationDays,
    assigned,
    invitationsSent,
    optedIn,
    confirmed,
    pending,
    remaining: progress.remaining,
    campaignUrl: campaignUrl(campaign.publicId),
    period: kind,
  });
  await sendDeveloperNotification({
    userId: campaign.userId,
    type: `managed_${kind}_report`,
    eventKey: `managed_report:${campaign.id}:${periodKey}`,
    preference: "managedTesting",
    subject: template.subject,
    text: template.text,
    html: template.html,
    immediate: true,
    inApp: {
      title: template.subject,
      body: `${appNameOf(campaign)} · day ${progress.day} of ${campaign.durationDays}.`,
      href: `/managed-testing/${campaign.publicId}`,
    },
  });
  await prisma.managedTestingCampaign.update({
    where: { id: campaign.id },
    data: { lastReportOn: now },
  });
  return true;
}

export async function adminListManagedTesting() {
  const [campaigns, payments, testers, pending] = await Promise.all([
    prisma.managedTestingCampaign.findMany({
      include: {
        user: { select: { developerName: true, name: true, email: true } },
        app: { select: { name: true } },
        payment: { include: { package: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.managedTestingPayment.findMany({
      include: {
        user: { select: { developerName: true, name: true, email: true } },
        package: true,
        campaign: { select: { publicId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.managedTester.count(),
    prisma.managedTestingPayment.count({
      where: { status: { in: ["PENDING", "PENDING_PAYMENT", "PROOF_SUBMITTED", "UNDER_REVIEW"] } },
    }),
  ]);
  const available = await prisma.managedTester.count({
    where: { consentStatus: "CONSENTED", availableForTesting: true, currentlyAssigned: false },
  });
  return { campaigns, payments, testers, pending, available };
}

export async function adminAddManagedTester(input: {
  name: string;
  email: string;
  googleAccountEmail?: string | null;
  consented?: boolean;
}) {
  const email = describeEmail(input.email);
  if (!email.valid) throw new AppError("Enter a valid tester email.");
  const play = input.googleAccountEmail?.trim() ? describeEmail(input.googleAccountEmail) : null;
  if (play && !play.valid) throw new AppError("Enter a valid Google Play email.");
  const consented = input.consented !== false;
  try {
    return await prisma.managedTester.create({
      data: {
        publicId: publicTesterId(),
        name: input.name.trim() || "Tester",
        email: email.normalized,
        googleAccountEmail: play?.normalized ?? email.normalized,
        consentStatus: consented ? "CONSENTED" : "PENDING",
        availableForTesting: consented,
      },
    });
  } catch {
    throw new AppError("That tester email is already in the pool.");
  }
}

export async function adminAllocateTesters(campaignPublicId: string) {
  const campaign = await prisma.managedTestingCampaign.findUnique({
    where: { publicId: campaignPublicId },
    include: { payment: { include: { package: true } } },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (isUsdTwelvePackage(campaign.payment.package.code)) {
    throw new AppError("This campaign uses a fixed tester pool.");
  }
  if (campaign.status !== "ACTIVE") throw new AppError("Testers can only be allocated to an active campaign.");
  const assigned = await assignConsentingTesters(campaign.id, campaign.testerTarget);
  await sendAssignmentInvites(campaign.id);
  return { assigned };
}
