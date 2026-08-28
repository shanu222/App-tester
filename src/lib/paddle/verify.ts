import { USD_TWELVE_PACKAGE_CODE, USD_TWELVE_PRICE_USD } from "@/lib/managed-testing/usd-twelve";
import { PADDLE_USD_CENTS } from "@/lib/paddle/config";

export type PaddlePriceLike = {
  id?: string | null;
  billingCycle?: unknown;
  unitPrice?: { amount?: string | null; currencyCode?: string | null } | null;
};

export type PaddleItemLike = {
  price?: PaddlePriceLike | null;
  priceId?: string | null;
};

export type PaddleTransactionLike = {
  id: string;
  status: string;
  customData?: unknown;
  items?: PaddleItemLike[] | null;
};

export function isFulfillablePaddleStatus(status: string) {
  return status === "completed" || status === "paid";
}

export function parsePaddlePaymentPublicId(customData: unknown): string | null {
  if (!customData || typeof customData !== "object") return null;
  const row = customData as Record<string, unknown>;
  const value = row.paymentPublicId ?? row.payment_public_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parsePaddlePackageCode(customData: unknown): string | null {
  if (!customData || typeof customData !== "object") return null;
  const row = customData as Record<string, unknown>;
  const value = row.packageCode ?? row.package_code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function paddleItemPriceId(item: PaddleItemLike) {
  return item.price?.id || item.priceId || null;
}

export function transactionContainsPriceId(transaction: PaddleTransactionLike, priceId: string) {
  if (!priceId) return false;
  return (transaction.items || []).some((item) => paddleItemPriceId(item) === priceId);
}

export function transactionLooksLikeUsdTenOneTime(transaction: PaddleTransactionLike, priceId: string) {
  const match = (transaction.items || []).find((item) => paddleItemPriceId(item) === priceId);
  if (!match?.price) return transactionContainsPriceId(transaction, priceId);
  if (match.price.billingCycle) return false;
  const amount = match.price.unitPrice?.amount;
  const currency = match.price.unitPrice?.currencyCode;
  if (amount && amount !== PADDLE_USD_CENTS) return false;
  if (currency && currency !== "USD") return false;
  return true;
}

export function assertTrustedPaddlePurchase(transaction: PaddleTransactionLike, priceId: string) {
  if (!isFulfillablePaddleStatus(transaction.status)) {
    return { ok: false as const, error: "Paddle has not completed this transaction yet." };
  }
  const paymentPublicId = parsePaddlePaymentPublicId(transaction.customData);
  if (!paymentPublicId) {
    return { ok: false as const, error: "This Paddle transaction is missing TestLoop payment data." };
  }
  const packageCode = parsePaddlePackageCode(transaction.customData);
  if (packageCode && packageCode !== USD_TWELVE_PACKAGE_CODE) {
    return { ok: false as const, error: "This Paddle transaction is not for the TestLoop $10 package." };
  }
  if (!transactionContainsPriceId(transaction, priceId)) {
    return { ok: false as const, error: "This Paddle transaction is not for the configured TestLoop price." };
  }
  if (!transactionLooksLikeUsdTenOneTime(transaction, priceId)) {
    return { ok: false as const, error: "This Paddle transaction is not a $10 USD one-time TestLoop purchase." };
  }
  return { ok: true as const, paymentPublicId, expectedUsd: USD_TWELVE_PRICE_USD };
}
