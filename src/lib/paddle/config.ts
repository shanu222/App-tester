import { USD_TWELVE_PACKAGE_CODE, USD_TWELVE_PRICE_USD } from "@/lib/managed-testing/usd-twelve";

export const PADDLE_USD_CENTS = String(USD_TWELVE_PRICE_USD * 100);
export const PADDLE_PACKAGE_CODE = USD_TWELVE_PACKAGE_CODE;

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function paddleEnvironmentName() {
  return readEnv("PADDLE_ENV") || readEnv("NEXT_PUBLIC_PADDLE_ENV") || "sandbox";
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

export function assertPaddleSandboxOnly() {
  const environment = paddleEnvironmentName().toLowerCase();
  if (environment && environment !== "sandbox") {
    throw new Error("Paddle Live is disabled. Set PADDLE_ENV=sandbox and NEXT_PUBLIC_PADDLE_ENV=sandbox.");
  }
  const apiKey = paddleApiKey();
  if (apiKey && apiKey.startsWith("pdl_live_")) {
    throw new Error("A live Paddle API key was provided. TestLoop only accepts sandbox keys (pdl_sdbx_).");
  }
  const token = paddleClientToken();
  if (token && !token.startsWith("test_")) {
    throw new Error("A live Paddle client token was provided. Use a sandbox client-side token (test_...).");
  }
}

export function paddleServerConfigured() {
  try {
    assertPaddleSandboxOnly();
  } catch {
    return false;
  }
  return Boolean(paddleApiKey() && paddlePriceId());
}

export function paddleCheckoutConfigured() {
  return paddleServerConfigured() && Boolean(paddleClientToken());
}

export function paddleWebhookConfigured() {
  try {
    assertPaddleSandboxOnly();
  } catch {
    return false;
  }
  return Boolean(paddleApiKey() && paddleWebhookSecret() && paddlePriceId());
}
