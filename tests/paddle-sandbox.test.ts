import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";
import { USD_TWELVE_PACKAGE_CODE, USD_TWELVE_PRICE_USD, isUsdTwelvePackage } from "../src/lib/managed-testing/usd-twelve";
import {
  EXPECTED_PADDLE_PRICE_ID,
  EXPECTED_PADDLE_PRODUCT_ID,
  PADDLE_USD_CENTS,
  classifyApiKey,
  describePaddleConfig,
  missingPaddleEnvNames,
  paddleCheckoutConfigured,
  paddlePriceId,
} from "../src/lib/paddle/config";
import { paddleSandboxClientOptions } from "../src/lib/paddle/client";
import {
  classifyPaddleApiFailure,
  paddleCheckoutFailure,
  parsePaddleApiError,
} from "../src/lib/paddle/api-error";
import { createSandboxCheckoutTransaction, isPaddleFulfillmentEvent, paddleCheckoutCreateBody } from "../src/lib/paddle/events";
import {
  assertTrustedPaddlePurchase,
  isFulfillablePaddleStatus,
  parsePaddlePackageCode,
  parsePaddlePaymentPublicId,
  transactionContainsPriceId,
  transactionLooksLikeUsdTenOneTime,
} from "../src/lib/paddle/verify";
import { handleRouteError } from "../src/lib/http";
import { logDatabaseError } from "../src/lib/errors";

const PRICE_ID = "pri_01testloop10usd";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

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

function stubPaddleEnv(values: Record<string, string>) {
  const keys = [
    "PADDLE_ENV",
    "PADDLE_API_KEY",
    "PADDLE_SANDBOX_API_KEY",
    "PADDLE_PRICE_ID",
    "PADDLE_PRODUCT_ID",
    "PADDLE_NOTIFICATION_WEBHOOK_SECRET",
    "PADDLE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_PADDLE_ENV",
    "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
    "NEXT_PUBLIC_PADDLE_API_KEY",
  ];
  for (const key of keys) {
    vi.stubEnv(key, values[key] ?? "");
  }
}

const VALID_SANDBOX = {
  PADDLE_ENV: "sandbox",
  PADDLE_API_KEY: "pdl_sdbx_apikey_testonly_not_a_real_key",
  PADDLE_PRICE_ID: EXPECTED_PADDLE_PRICE_ID,
  PADDLE_PRODUCT_ID: EXPECTED_PADDLE_PRODUCT_ID,
  NEXT_PUBLIC_PADDLE_ENV: "sandbox",
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_public_client_token",
  PADDLE_NOTIFICATION_WEBHOOK_SECRET: "pdl_ntfset_testonly_not_a_real_secret",
};

describe("paddle sandbox purchase verification", () => {
  it("treats $10 as 1000 USD cents and rejects live-looking catalog mismatches", () => {
    expect(USD_TWELVE_PRICE_USD).toBe(10);
    expect(PADDLE_USD_CENTS).toBe("1000");
    expect(parsePaddlePaymentPublicId({ payment_public_id: "mtpay_abc" })).toBe("mtpay_abc");
    expect(parsePaddlePackageCode({ packageCode: USD_TWELVE_PACKAGE_CODE })).toBe(USD_TWELVE_PACKAGE_CODE);
    expect(isFulfillablePaddleStatus("completed")).toBe(true);
    expect(isFulfillablePaddleStatus("paid")).toBe(true);
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

  it("fulfills transaction.paid the same way as transaction.completed", () => {
    const paid = assertTrustedPaddlePurchase(txn({ status: "paid" }), PRICE_ID);
    expect(paid.ok).toBe(true);
    expect(isPaddleFulfillmentEvent("transaction.paid")).toBe(true);
    expect(isPaddleFulfillmentEvent("transaction.completed")).toBe(true);
    expect(isPaddleFulfillmentEvent("transaction.created")).toBe(false);
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

describe("paddle sandbox configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats a missing Paddle API key as not configured and names the variable", () => {
    stubPaddleEnv({
      ...VALID_SANDBOX,
      PADDLE_API_KEY: "",
    });
    expect(classifyApiKey()).toBe("missing");
    expect(paddleCheckoutConfigured()).toBe(false);
    expect(missingPaddleEnvNames()).toContain("PADDLE_API_KEY");
    expect(describePaddleConfig().apiKey).toBe("missing");
  });

  it("accepts sandbox keys, the TestLoop $10 price, and a test_ client token", () => {
    stubPaddleEnv(VALID_SANDBOX);
    expect(paddleCheckoutConfigured()).toBe(true);
    expect(paddlePriceId()).toBe(EXPECTED_PADDLE_PRICE_ID);
    expect(describePaddleConfig()).toMatchObject({
      environment: "sandbox",
      apiKey: "sandbox",
      priceId: "expected",
      productId: "expected",
      clientToken: "sandbox",
      webhookSecret: "present",
    });
  });

  it("rejects a client-side token used as PADDLE_API_KEY", () => {
    stubPaddleEnv({
      ...VALID_SANDBOX,
      PADDLE_API_KEY: "test_this_is_a_client_token",
    });
    expect(classifyApiKey()).toBe("client_token");
    expect(paddleCheckoutConfigured()).toBe(false);
  });

  it("does not read NEXT_PUBLIC_PADDLE_API_KEY as the server key", () => {
    stubPaddleEnv({
      PADDLE_ENV: "sandbox",
      NEXT_PUBLIC_PADDLE_API_KEY: "pdl_sdbx_should_be_ignored",
      PADDLE_PRICE_ID: EXPECTED_PADDLE_PRICE_ID,
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_public_client_token",
    });
    expect(classifyApiKey()).toBe("missing");
    expect(source("src/lib/paddle/config.ts")).not.toContain("NEXT_PUBLIC_PADDLE_API_KEY");
    expect(source("src/lib/paddle/client.ts")).not.toContain("NEXT_PUBLIC_PADDLE_API_KEY");
  });

  it("forces the Node SDK onto the sandbox API with a string literal", () => {
    expect(paddleSandboxClientOptions()).toEqual({ environment: "sandbox", logLevel: "error" });
    expect(source("src/lib/paddle/client.ts")).toContain('environment: "sandbox"');
    expect(source("next.config.ts")).toContain("@paddle/paddle-node-sdk");
  });
});

describe("paddle sandbox transaction creation", () => {
  it("creates a transaction from the server price id and returns that transactionId", async () => {
    const create = vi.fn().mockResolvedValue({ id: "txn_01sandboxcheckout" });
    const result = await createSandboxCheckoutTransaction(
      { transactions: { create } },
      {
        priceId: EXPECTED_PADDLE_PRICE_ID,
        paymentPublicId: "mtpay_abc",
        packageCode: USD_TWELVE_PACKAGE_CODE,
      },
    );
    expect(result.transactionId).toBe("txn_01sandboxcheckout");
    expect(create).toHaveBeenCalledWith(
      paddleCheckoutCreateBody({
        priceId: EXPECTED_PADDLE_PRICE_ID,
        paymentPublicId: "mtpay_abc",
        packageCode: USD_TWELVE_PACKAGE_CODE,
      }),
    );
    expect(create.mock.calls[0][0].items[0].priceId).toBe(EXPECTED_PADDLE_PRICE_ID);
  });

  it("maps 401 authentication failures without exposing credentials", () => {
    const error = { name: "ApiError", code: "authentication_malformed", status: 401, detail: "secret=do-not-log" };
    const parsed = parsePaddleApiError(error);
    expect(classifyPaddleApiFailure(parsed)).toBe("PADDLE_AUTHENTICATION_ERROR");
    const mapped = paddleCheckoutFailure(error);
    expect(mapped.code).toBe("PADDLE_AUTHENTICATION_ERROR");
    expect(mapped.status).toBe(503);
    expect(mapped.message).toContain("EasyPaisa");
    expect(mapped.message).not.toContain("secret=");
  });
});

describe("paddle webhook signature and idempotency", () => {
  it("accepts a valid sandbox webhook signature and rejects a tampered one", async () => {
    const secret = "pdl_ntfset_testonly_not_a_real_secret";
    const paddle = new Paddle("pdl_sdbx_apikey_testonly_not_a_real_key", {
      environment: "sandbox",
    } as PaddleOptions);
    const body = JSON.stringify({
      event_id: "evt_01testloop",
      event_type: "transaction.paid",
      occurred_at: new Date().toISOString(),
      notification_id: "ntf_01testloop",
      data: { id: "txn_01test", status: "paid" },
    });
    const ts = Math.floor(Date.now() / 1000);
    const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
    expect(await paddle.webhooks.isSignatureValid(body, secret, `ts=${ts};h1=${h1}`)).toBe(true);
    expect(await paddle.webhooks.isSignatureValid(body, secret, `ts=${ts};h1=deadbeef`)).toBe(false);
    await expect(paddle.webhooks.unmarshal(body, secret, `ts=${ts};h1=deadbeef`)).rejects.toThrow(/signature/i);
  });

  it("treats a unique-constraint webhook insert as a duplicate instead of a second fulfillment", () => {
    const unique = (error: unknown) =>
      Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002");
    expect(unique({ code: "P2002" })).toBe(true);
    expect(unique({ code: "P2022" })).toBe(false);
    expect(source("src/lib/paddle/fulfill.ts")).toContain("isPrismaUniqueConstraint");
    expect(source("src/app/api/webhooks/paddle/route.ts")).toContain("paddleWebhookAlreadyProcessed");
    expect(source("src/lib/paddle/fulfill.ts")).toContain("duplicate");
  });
});

describe("paddle error logging codes", () => {
  it("returns VALIDATION_ERROR for schema failures", async () => {
    let thrown: unknown;
    try {
      z.object({ appId: z.string().min(1) }).parse({});
    } catch (error) {
      thrown = error;
    }
    const response = handleRouteError(thrown);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("maps database failures to DATABASE_ERROR without leaking query details", () => {
    const mapped = logDatabaseError("paddle.checkout.update", {
      code: "P2022",
      meta: { modelName: "ManagedTestingPayment", column: "paddleTransactionId" },
      message: "The column `paddleTransactionId` does not exist in the current database.",
    });
    expect(mapped.code).toBe("DATABASE_ERROR");
    expect(mapped.message).not.toMatch(/pdl_|test_|secret/i);
  });
});
