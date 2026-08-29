import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  USD_TWELVE_PAYMENT_CHOICES,
  isUsdTwelvePaymentChoice,
  isWalletPurchaseMethod,
  providerForMethod,
  walletPurchaseMethods,
  WALLET_PURCHASE_METHOD_IDS,
} from "../src/lib/managed-testing/methods";
import {
  USD_TWELVE_INCLUDED,
  USD_TWELVE_PACKAGE_CODE,
  isUsdTwelvePackage,
} from "../src/lib/managed-testing/usd-twelve";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("usd_12_14 payment channels", () => {
  it("accepts Paddle plus the five existing wallets for the same package", () => {
    expect(USD_TWELVE_PAYMENT_CHOICES).toEqual([
      "PADDLE",
      "EASYPAISA",
      "JAZZCASH",
      "SADAPAY",
      "NAYAPAY",
      "BINANCE_USDT",
    ]);
    expect(isUsdTwelvePaymentChoice("PADDLE")).toBe(true);
    expect(isUsdTwelvePaymentChoice("REVENUECAT")).toBe(false);
    expect(isUsdTwelvePaymentChoice("testers_12")).toBe(false);
    for (const id of WALLET_PURCHASE_METHOD_IDS) {
      expect(isWalletPurchaseMethod(id)).toBe(true);
      expect(isUsdTwelvePaymentChoice(id)).toBe(true);
    }
    expect(providerForMethod("EASYPAISA")).toBe("EASYPAISA");
    expect(providerForMethod("JAZZCASH")).toBe("JAZZCASH");
    expect(providerForMethod("SADAPAY")).toBe("SADAPAY");
    expect(providerForMethod("NAYAPAY")).toBe("NAYAPAY");
    expect(providerForMethod("BINANCE_USDT")).toBe("BINANCE");
  });

  it("keeps wallet account details on EasyPaisa, JazzCash, SadaPay, NayaPay, and Binance", () => {
    const wallets = walletPurchaseMethods();
    expect(wallets.map((item) => item.shortLabel)).toEqual([
      "EasyPaisa",
      "JazzCash",
      "SadaPay",
      "NayaPay",
      "Binance",
    ]);
    expect(wallets.find((item) => item.id === "EASYPAISA")?.copyValue).toContain("923403318127");
    expect(wallets.find((item) => item.id === "JAZZCASH")?.copyValue).toContain("923403318127");
    expect(wallets.find((item) => item.id === "SADAPAY")?.copyValue).toContain("923403318127");
    expect(wallets.find((item) => item.id === "NAYAPAY")?.copyValue).toContain("923403318127");
    expect(wallets.find((item) => item.id === "BINANCE_USDT")?.copyValue).toBe(
      "0x039a8c041809cdf0192ced7d904df1353913b53a",
    );
    expect(wallets.find((item) => item.id === "BINANCE_USDT")?.network).toBe("BSC");
  });

  it("does not treat wallet proof submission as paid", () => {
    const proof = source("src/lib/services/managed-testing.ts");
    const start = proof.indexOf("export async function submitPaymentProof");
    const next = proof.indexOf("\nexport async function", start + 10);
    const submitFn = proof.slice(start, next === -1 ? undefined : next);
    expect(submitFn).toContain('status: "UNDER_REVIEW"');
    expect(submitFn).not.toContain('status: "APPROVED"');
    expect(submitFn).not.toContain('status: "PAID"');
    expect(proof).toContain("issuePaymentConfirmToken");
    expect(proof).toContain("adminApprovePayment");
    expect(proof).toContain('markPaymentPaid(payment.id, "MANUAL"');
  });

  it("lists only usd_12_14 as the purchasable package and keeps old PKR packs inactive", () => {
    const listing = source("src/lib/services/managed-testing.ts");
    expect(listing).toMatch(/where:\s*\{\s*active:\s*true,\s*code:\s*USD_TWELVE_PACKAGE_CODE/);
    expect(isUsdTwelvePackage(USD_TWELVE_PACKAGE_CODE)).toBe(true);
    for (const code of ["testers_12", "testers_20", "testers_30", "testers_50", "custom"]) {
      expect(isUsdTwelvePackage(code)).toBe(false);
    }
    const deactivate = source("prisma/migrations/20260829070000_only_usd_twelve_package/migration.sql");
    expect(deactivate).toContain("testers_12");
    expect(deactivate).toContain("testers_20");
    expect(deactivate).toContain("testers_30");
    expect(deactivate).toContain("testers_50");
    expect(deactivate).toContain("custom");
    expect(deactivate).toMatch(/"active" = false/i);
  });

  it("creates Paddle transactions from the server PADDLE_PRICE_ID only", () => {
    const checkout = source("src/lib/paddle/checkout.ts");
    expect(checkout).toContain("paddlePriceId()");
    expect(checkout).toContain("items: [{ priceId, quantity: 1 }]");
    expect(checkout).not.toMatch(/input\.priceId|body\.priceId|clientPriceId/);
    const route = source("src/app/api/managed-testing/usd-twelve/route.ts");
    expect(route).toContain("USD_TWELVE_PAYMENT_CHOICES");
    expect(route).not.toMatch(/priceId|amountUsd|amountPkr/);
  });

  it("keeps the Paddle webhook public, signature-checked, and idempotent", () => {
    const middleware = source("src/middleware.ts");
    expect(middleware).toContain("/api/webhooks/paddle");
    const webhook = source("src/app/api/webhooks/paddle/route.ts");
    expect(webhook).toContain("unmarshal");
    expect(webhook).toContain("paddleWebhookAlreadyProcessed");
    expect(webhook).toContain("TransactionCompleted");
    expect(webhook).toContain("TransactionPaid");
    expect(webhook).not.toContain("requireUser");
    const fulfill = source("src/lib/paddle/fulfill.ts");
    expect(fulfill).toContain("activateManagedPaymentFromPaddle");
    expect(fulfill).toContain("paddlePriceId()");
    expect(source("src/lib/services/managed-testing.ts")).toContain("fulfillUsdTwelvePackage");
  });

  it("shows Paddle and wallets on the purchase page for the same included package", () => {
    const form = source("src/components/managed-testing/usd-twelve-checkout-form.tsx");
    expect(form).toContain("Paddle");
    expect(form).toContain("EasyPaisa");
    expect(form).toContain("JazzCash");
    expect(form).toContain("SadaPay");
    expect(form).toContain("NayaPay");
    expect(form).toContain("Binance");
    expect(form).toContain("Sandbox payment available for testing");
    expect(form).toContain("administrator must confirm");
    expect(form).not.toMatch(/Sandbox cards only until Live is enabled/);
    expect(USD_TWELVE_INCLUDED).toContain("12 managed testers");
    expect(USD_TWELVE_INCLUDED).toContain("14-day testing status");
  });

  it("does not describe generic app failures as Google Play changes", () => {
    const globalError = source("src/app/error.tsx");
    expect(globalError).not.toMatch(/Google Play data was changed/);
    const playError = source("src/app/play/error.tsx");
    expect(playError).toMatch(/No Google Play data was changed/);
    const errors = source("src/lib/errors.ts");
    expect(errors).toContain("isPlayInfrastructureFailure");
    expect(errors).not.toContain("An unexpected error occurred. No Google Play data was changed.");
  });
});
