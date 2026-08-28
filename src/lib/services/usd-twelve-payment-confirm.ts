import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { paymentConfirmNonceHash, verifyPaymentConfirmToken } from "@/lib/managed-testing/payment-confirm-token";
import { isUsdTwelvePackage, parseUsdTwelveFulfillment } from "@/lib/managed-testing/usd-twelve";
import { paymentIsActivated, paymentMethodById } from "@/lib/managed-testing/methods";
import { formatPackageAmount } from "@/lib/managed-testing/catalog";
import { adminMarkPaymentPaid } from "@/lib/services/managed-testing";

export async function previewUsdTwelvePaymentConfirm(token: string) {
  const payload = verifyPaymentConfirmToken(token);
  if (!payload) {
    throw new AppError("This confirmation link is invalid or has expired.", 400, "CONFIRM_TOKEN_INVALID");
  }
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: payload.pid },
    include: {
      package: true,
      user: { select: { email: true, name: true, developerName: true } },
    },
  });
  if (!payment || !isUsdTwelvePackage(payment.package.code)) {
    throw new NotFoundError("Payment not found.");
  }
  if (payment.confirmTokenHash !== paymentConfirmNonceHash(payload.n)) {
    throw new AppError("This confirmation link is invalid or has expired.", 400, "CONFIRM_TOKEN_INVALID");
  }
  const fulfillment = parseUsdTwelveFulfillment(payment.fulfillment);
  const app = fulfillment
    ? await prisma.app.findFirst({ where: { id: fulfillment.appId, userId: payment.userId }, select: { name: true } })
    : null;
  const alreadyConfirmed = paymentIsActivated(payment.status) || Boolean(payment.confirmTokenUsedAt);
  return {
    token,
    alreadyConfirmed,
    expired: Boolean(payment.confirmTokenExpiresAt && payment.confirmTokenExpiresAt.getTime() <= Date.now()),
    developerName: payment.user.developerName || payment.user.name || payment.user.email,
    developerEmail: payment.user.email,
    appName: app?.name || "App",
    amountLabel: formatPackageAmount(payment.amountPkr, payment.currency),
    methodLabel: paymentMethodById(payment.method)?.label || "Not selected",
    transactionReference: payment.transactionReference,
    status: payment.status,
  };
}

export async function confirmUsdTwelvePaymentFromToken(token: string) {
  const payload = verifyPaymentConfirmToken(token);
  if (!payload) {
    throw new AppError("This confirmation link is invalid or has expired.", 400, "CONFIRM_TOKEN_INVALID");
  }
  const payment = await prisma.managedTestingPayment.findUnique({
    where: { publicId: payload.pid },
    include: { package: true, campaign: { select: { publicId: true } } },
  });
  if (!payment || !isUsdTwelvePackage(payment.package.code)) {
    throw new NotFoundError("Payment not found.");
  }
  if (payment.confirmTokenHash !== paymentConfirmNonceHash(payload.n)) {
    throw new AppError("This confirmation link is invalid or has expired.", 400, "CONFIRM_TOKEN_INVALID");
  }
  if (payment.confirmTokenExpiresAt && payment.confirmTokenExpiresAt.getTime() <= Date.now() && !paymentIsActivated(payment.status)) {
    throw new AppError("This confirmation link has expired.", 400, "CONFIRM_TOKEN_EXPIRED");
  }
  if (paymentIsActivated(payment.status)) {
    return {
      alreadyConfirmed: true as const,
      campaignPublicId: payment.campaign?.publicId ?? null,
      transactionReference: payment.transactionReference,
    };
  }
  const consumed = await prisma.managedTestingPayment.updateMany({
    where: {
      id: payment.id,
      confirmTokenHash: paymentConfirmNonceHash(payload.n),
      confirmTokenUsedAt: null,
      status: { in: ["PENDING", "PENDING_PAYMENT", "PROOF_SUBMITTED", "UNDER_REVIEW"] },
    },
    data: { confirmTokenUsedAt: new Date() },
  });
  if (consumed.count !== 1) {
    const latest = await prisma.managedTestingPayment.findUnique({ where: { id: payment.id } });
    if (latest && paymentIsActivated(latest.status)) {
      return {
        alreadyConfirmed: true as const,
        campaignPublicId: null,
        transactionReference: payment.transactionReference,
      };
    }
    throw new AppError("This confirmation link has already been used.", 409, "CONFIRM_TOKEN_USED");
  }
  const result = await adminMarkPaymentPaid(payment.publicId);
  return {
    alreadyConfirmed: result.alreadyPaid,
    campaignPublicId: result.campaignPublicId,
    transactionReference: payment.transactionReference,
  };
}
