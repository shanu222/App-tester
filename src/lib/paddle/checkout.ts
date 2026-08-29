import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { USD_TWELVE_PACKAGE_CODE, isUsdTwelvePackage } from "@/lib/managed-testing/usd-twelve";
import { getPaddleSandboxClient } from "@/lib/paddle/client";
import { paddleServerConfigured, paddlePriceId } from "@/lib/paddle/config";
import { isFulfillablePaddleStatus } from "@/lib/paddle/verify";

export async function ensurePaddleCheckoutTransaction(input: { userId: string; paymentPublicId: string }) {
  if (!paddleServerConfigured()) {
    throw new AppError("Paddle sandbox checkout is not configured yet.", 503, "PADDLE_NOT_CONFIGURED");
  }
  const priceId = paddlePriceId();
  const payment = await prisma.managedTestingPayment.findFirst({
    where: { publicId: input.paymentPublicId, userId: input.userId },
    include: { package: true },
  });
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

  const transaction = await paddle.transactions.create({
    items: [{ priceId, quantity: 1 }],
    collectionMode: "automatic",
    customData: {
      paymentPublicId: payment.publicId,
      packageCode: USD_TWELVE_PACKAGE_CODE,
    },
  }).catch((error) => {
    console.error("Paddle checkout create failed", error instanceof Error ? error.name : "error");
    throw new AppError(
      "Paddle checkout could not be started. Pay with EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance instead, or try Paddle again.",
      503,
      "PADDLE_CHECKOUT_FAILED",
    );
  });

  await prisma.managedTestingPayment.update({
    where: { id: payment.id },
    data: {
      paddleTransactionId: transaction.id,
      provider: "PADDLE",
    },
  });

  return { transactionId: transaction.id, reused: false as const };
}
