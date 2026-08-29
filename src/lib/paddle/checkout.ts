import { prisma } from "@/lib/db";
import { AppError, NotFoundError, logDatabaseError } from "@/lib/errors";
import { USD_TWELVE_PACKAGE_CODE, isUsdTwelvePackage } from "@/lib/managed-testing/usd-twelve";
import { paddleCheckoutFailure, paddleConfigurationError } from "@/lib/paddle/api-error";
import { getPaddleSandboxClient } from "@/lib/paddle/client";
import {
  EXPECTED_PADDLE_PRICE_ID,
  describePaddleConfig,
  paddleCheckoutConfigured,
  paddlePriceId,
} from "@/lib/paddle/config";
import { createSandboxCheckoutTransaction } from "@/lib/paddle/events";
import { isFulfillablePaddleStatus } from "@/lib/paddle/verify";

export async function ensurePaddleCheckoutTransaction(input: { userId: string; paymentPublicId: string }) {
  if (!paddleCheckoutConfigured()) {
    throw paddleConfigurationError("checkout not configured", describePaddleConfig().missingNames);
  }
  const priceId = paddlePriceId();
  if (priceId !== EXPECTED_PADDLE_PRICE_ID) {
    throw paddleConfigurationError("PADDLE_PRICE_ID is not the TestLoop $10 sandbox price", ["PADDLE_PRICE_ID"]);
  }

  let payment;
  try {
    payment = await prisma.managedTestingPayment.findFirst({
      where: { publicId: input.paymentPublicId, userId: input.userId },
      include: { package: true },
    });
  } catch (error) {
    throw logDatabaseError("ensurePaddleCheckoutTransaction.findFirst", error);
  }
  if (!payment) throw new NotFoundError("Payment not found.");
  if (!isUsdTwelvePackage(payment.package.code)) {
    throw new AppError("Paddle checkout is only available for the TestLoop $10 package.");
  }
  if (payment.status === "APPROVED" || payment.status === "PAID") {
    throw new AppError("This package is already paid.");
  }
  if (
    payment.status !== "PENDING" &&
    payment.status !== "PENDING_PAYMENT" &&
    payment.status !== "REJECTED"
  ) {
    throw new AppError("This payment is not awaiting checkout.");
  }

  const paddle = getPaddleSandboxClient();
  if (payment.paddleTransactionId) {
    try {
      const existing = await paddle.transactions.get(payment.paddleTransactionId);
      if (isFulfillablePaddleStatus(existing.status)) {
        return { transactionId: existing.id, reused: true as const };
      }
      if (existing.status !== "canceled" && existing.status !== "past_due") {
        return { transactionId: existing.id, reused: true as const };
      }
    } catch {
      // Create a replacement transaction if the stored id is no longer usable.
    }
  }

  let created: { transactionId: string };
  try {
    created = await createSandboxCheckoutTransaction(paddle, {
      priceId,
      paymentPublicId: payment.publicId,
      packageCode: USD_TWELVE_PACKAGE_CODE,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw paddleCheckoutFailure(error);
  }

  try {
    await prisma.managedTestingPayment.update({
      where: { id: payment.id },
      data: {
        paddleTransactionId: created.transactionId,
        provider: "PADDLE",
      },
    });
  } catch (error) {
    throw logDatabaseError("ensurePaddleCheckoutTransaction.update", error);
  }

  return { transactionId: created.transactionId, reused: false as const };
}
