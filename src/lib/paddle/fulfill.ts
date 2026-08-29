import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { isUsdTwelvePackage } from "@/lib/managed-testing/usd-twelve";
import { activateManagedPaymentFromPaddle } from "@/lib/services/managed-testing";
import { getPaddleSandboxClient } from "@/lib/paddle/client";
import { paddlePriceId } from "@/lib/paddle/config";
import { assertTrustedPaddlePurchase, type PaddleTransactionLike } from "@/lib/paddle/verify";

export function isPrismaUniqueConstraint(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002");
}

export async function recordPaddleWebhookEvent(eventId: string, eventType: string) {
  try {
    await prisma.paddleWebhookEvent.create({ data: { eventId, eventType } });
    return "recorded" as const;
  } catch (error) {
    if (isPrismaUniqueConstraint(error)) return "duplicate" as const;
    throw error;
  }
}

export async function paddleWebhookAlreadyProcessed(eventId: string) {
  const existing = await prisma.paddleWebhookEvent.findUnique({ where: { eventId } });
  return Boolean(existing);
}

export async function fulfillVerifiedPaddleTransaction(
  transaction: PaddleTransactionLike,
  options?: { expectedUserId?: string },
) {
  const trusted = assertTrustedPaddlePurchase(transaction, paddlePriceId());
  if (!trusted.ok) throw new AppError(trusted.error);
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId: trusted.paymentPublicId },
    include: { package: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (!isUsdTwelvePackage(payment.package.code)) {
    throw new AppError("This Paddle transaction is not for the TestLoop package.");
  }
  if (options?.expectedUserId && payment.userId !== options.expectedUserId) {
    throw new AppError("This Paddle transaction does not belong to the signed-in account.", 403);
  }
  if (payment.paddleTransactionId && payment.paddleTransactionId !== transaction.id) {
    throw new AppError("This payment is already linked to a different Paddle transaction.");
  }
  return activateManagedPaymentFromPaddle(payment.id, transaction.id);
}

export async function syncPaddleTransactionFromApi(input: {
  userId: string;
  paymentPublicId: string;
  transactionId: string;
}) {
  if (!input.transactionId.startsWith("txn_")) {
    throw new AppError("That Paddle transaction id is invalid.");
  }
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId: input.paymentPublicId, userId: input.userId },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (payment.paddleTransactionId && payment.paddleTransactionId !== input.transactionId) {
    throw new AppError("This payment is already linked to a different Paddle transaction.");
  }
  const paddle = getPaddleSandboxClient();
  const transaction = await paddle.transactions.get(input.transactionId);
  return fulfillVerifiedPaddleTransaction(transaction, { expectedUserId: input.userId });
}
