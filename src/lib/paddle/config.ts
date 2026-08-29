import { USD_TWELVE_PACKAGE_CODE, USD_TWELVE_PRICE_USD } from "@/lib/managed-testing/usd-twelve";

export const PADDLE_USD_CENTS = String(USD_TWELVE_PRICE_USD * 100);
export const PADDLE_PACKAGE_CODE = USD_TWELVE_PACKAGE_CODE;
export const EXPECTED_PADDLE_PRODUCT_ID = "pro_01m15ad4v6dte9n80xw7f07chn";
export const EXPECTED_PADDLE_PRICE_ID = "pri_01m15ad5sg0z3kffms99dd2z2b";
export const PADDLE_SANDBOX_API_BASE = "https://sandbox-api.paddle.com";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function paddleEnvironmentName() {
  return (readEnv("PADDLE_ENV") || readEnv("NEXT_PUBLIC_PADDLE_ENV") || "sandbox").toLowerCase();
}

export function paddleApiKey() {
  return readEnv("PADDLE_API_KEY") || readEnv("PADDLE_SANDBOX_API_KEY");
}

export function paddleWebhookSecret() {
  return readEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET") || readEnv("PADDLE_WEBHOOK_SECRET");
}

export function paddlePriceId() {
  return readEnv("PADDLE_PRICE_ID");
}

export function paddleProductId() {
  return readEnv("PADDLE_PRODUCT_ID");
}

export function paddleClientToken() {
  return readEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
}

export type PaddleSecretKind = "missing" | "sandbox" | "live" | "client_token" | "unknown";
export type PaddleCatalogKind = "missing" | "expected" | "mismatch";

export function classifyApiKey(value = paddleApiKey()): PaddleSecretKind {
  if (!value) return "missing";
  if (value.startsWith("pdl_sdbx_")) return "sandbox";
  if (value.startsWith("pdl_live_")) return "live";
  if (value.startsWith("test_")) return "client_token";
  return "unknown";
}

export function classifyClientToken(value = paddleClientToken()): PaddleSecretKind {
  if (!value) return "missing";
  if (value.startsWith("test_")) return "sandbox";
  if (value.startsWith("live_")) return "live";
  return "unknown";
}

export function classifyCatalogId(actual: string, expected: string): PaddleCatalogKind {
  if (!actual) return "missing";
  return actual === expected ? "expected" : "mismatch";
}

/** Names only — never values. */
export function missingPaddleEnvNames() {
  const names: string[] = [];
  if (!paddleApiKey()) names.push("PADDLE_API_KEY");
  if (!paddlePriceId()) names.push("PADDLE_PRICE_ID");
  if (!paddleClientToken()) names.push("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  if (!paddleWebhookSecret()) names.push("PADDLE_NOTIFICATION_WEBHOOK_SECRET");
  if (!paddleProductId()) names.push("PADDLE_PRODUCT_ID");
  if (!readEnv("PADDLE_ENV") && !readEnv("NEXT_PUBLIC_PADDLE_ENV")) names.push("PADDLE_ENV");
  return names;
}

export function describePaddleConfig() {
  const environment = paddleEnvironmentName();
  return {
    environment,
    sandboxOnly: environment === "sandbox",
    apiKey: classifyApiKey(),
    priceId: classifyCatalogId(paddlePriceId(), EXPECTED_PADDLE_PRICE_ID),
    productId: classifyCatalogId(paddleProductId(), EXPECTED_PADDLE_PRODUCT_ID),
    clientToken: classifyClientToken(),
    webhookSecret: paddleWebhookSecret() ? ("present" as const) : ("missing" as const),
    missingNames: missingPaddleEnvNames(),
  };
}

export function assertPaddleSandboxOnly() {
  const environment = paddleEnvironmentName();
  if (environment && environment !== "sandbox") {
    throw new Error("Paddle Live is disabled. Set PADDLE_ENV=sandbox and NEXT_PUBLIC_PADDLE_ENV=sandbox.");
  }
  const apiKeyKind = classifyApiKey();
  if (apiKeyKind === "live") {
    throw new Error("A live Paddle API key was provided. TestLoop only accepts sandbox keys (pdl_sdbx_).");
  }
  if (apiKeyKind === "client_token") {
    throw new Error("PADDLE_API_KEY is a client-side token. Set the sandbox server API key (pdl_sdbx_) instead.");
  }
  if (apiKeyKind === "unknown") {
    throw new Error("PADDLE_API_KEY is not a sandbox server key. Use a key that starts with pdl_sdbx_.");
  }
  const tokenKind = classifyClientToken();
  if (tokenKind === "live" || tokenKind === "unknown") {
    throw new Error("A live Paddle client token was provided. Use a sandbox client-side token (test_...).");
  }
  const priceId = paddlePriceId();
  if (priceId && priceId !== EXPECTED_PADDLE_PRICE_ID) {
    throw new Error("PADDLE_PRICE_ID must be the TestLoop $10 sandbox price pri_01m15ad5sg0z3kffms99dd2z2b.");
  }
  const productId = paddleProductId();
  if (productId && productId !== EXPECTED_PADDLE_PRODUCT_ID) {
    throw new Error("PADDLE_PRODUCT_ID must be the TestLoop sandbox product pro_01m15ad4v6dte9n80xw7f07chn.");
  }
}

export function paddleServerConfigured() {
  try {
    assertPaddleSandboxOnly();
  } catch {
    return false;
  }
  return classifyApiKey() === "sandbox" && paddlePriceId() === EXPECTED_PADDLE_PRICE_ID;
}

export function paddleCheckoutConfigured() {
  return paddleServerConfigured() && classifyClientToken() === "sandbox";
}

export function paddleWebhookConfigured() {
  try {
    assertPaddleSandboxOnly();
  } catch {
    return false;
  }
  return paddleServerConfigured() && Boolean(paddleWebhookSecret());
}
