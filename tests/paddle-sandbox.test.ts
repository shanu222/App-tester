import { describe, expect, it } from "vitest";
import { USD_TWELVE_PACKAGE_CODE, USD_TWELVE_PRICE_USD, isUsdTwelvePackage } from "../src/lib/managed-testing/usd-twelve";
import { PADDLE_USD_CENTS } from "../src/lib/paddle/config";
import {
  assertTrustedPaddlePurchase,
  isFulfillablePaddleStatus,
  parsePaddlePackageCode,
  parsePaddlePaymentPublicId,
  transactionContainsPriceId,
  transactionLooksLikeUsdTenOneTime,
} from "../src/lib/paddle/verify";

const PRICE_ID = "pri_01testloop10usd";

function txn(overrides: Record<string, unknown> = {}) {
  return {
    id: "txn_01test",
    status: "completed",
    customData: { paymentPublicId: "mtpay_abc", packageCode: USD_TWELVE_PACKAGE_CODE },
    items: [
      {
        price: {
          id: PRICE_ID,
          billingCycle: null,
          unitPrice: { amount: PADDLE_USD_CENTS, currencyCode: "USD" },
        },
      },
    ],
    ...overrides,
  };
}

describe("paddle sandbox purchase verification", () => {
  it("treats $10 as 1000 USD cents and rejects live-looking catalog mismatches", () => {
    expect(USD_TWELVE_PRICE_USD).toBe(10);
    expect(PADDLE_USD_CENTS).toBe("1000");
    expect(parsePaddlePaymentPublicId({ payment_public_id: "mtpay_abc" })).toBe("mtpay_abc");
    expect(parsePaddlePackageCode({ packageCode: USD_TWELVE_PACKAGE_CODE })).toBe(USD_TWELVE_PACKAGE_CODE);
    expect(isFulfillablePaddleStatus("completed")).toBe(true);
    expect(isFulfillablePaddleStatus("draft")).toBe(false);
  });

  it("accepts a completed one-time $10 transaction for the configured price", () => {
    const result = assertTrustedPaddlePurchase(txn(), PRICE_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentPublicId).toBe("mtpay_abc");
      expect(result.expectedUsd).toBe(10);
    }
  });

  it("does not trust a client-supplied different price or a subscription", () => {
    expect(transactionContainsPriceId(txn(), "pri_other")).toBe(false);
    expect(
      transactionLooksLikeUsdTenOneTime(
        txn({
          items: [
            {
              price: {
                id: PRICE_ID,
                billingCycle: { interval: "month", frequency: 1 },
                unitPrice: { amount: PADDLE_USD_CENTS, currencyCode: "USD" },
              },
            },
          ],
        }),
        PRICE_ID,
      ),
    ).toBe(false);
    const wrongPrice = assertTrustedPaddlePurchase(txn(), "pri_attacker");
    expect(wrongPrice.ok).toBe(false);
  });

  it("ignores duplicate-looking unpaid events", () => {
    const result = assertTrustedPaddlePurchase(txn({ status: "ready" }), PRICE_ID);
    expect(result.ok).toBe(false);
  });

  it("keeps the $10 catalog as one-time usd_12_14, not a subscription or PKR pack", () => {
    expect(isUsdTwelvePackage("usd_12_14")).toBe(true);
    expect(isUsdTwelvePackage("testers_12")).toBe(false);
    expect(isUsdTwelvePackage("testers_20")).toBe(false);
    expect(isUsdTwelvePackage("testers_30")).toBe(false);
    expect(isUsdTwelvePackage("testers_50")).toBe(false);
    expect(isUsdTwelvePackage("custom")).toBe(false);
    expect(USD_TWELVE_PACKAGE_CODE).toBe("usd_12_14");
    expect(USD_TWELVE_PRICE_USD).toBe(10);
  });
});
