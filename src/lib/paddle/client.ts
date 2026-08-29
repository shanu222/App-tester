import { Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";
import { paddleConfigurationError } from "@/lib/paddle/api-error";
import {
  assertPaddleSandboxOnly,
  classifyApiKey,
  describePaddleConfig,
  paddleApiKey,
} from "@/lib/paddle/config";

/** String literal — do not use the SDK Environment enum (Next.js bundling can leave it undefined). */
const SANDBOX_CLIENT_OPTIONS = {
  environment: "sandbox",
  logLevel: "error",
} as PaddleOptions;

export function getPaddleSandboxClient() {
  try {
    assertPaddleSandboxOnly();
  } catch (error) {
    throw paddleConfigurationError(
      error instanceof Error ? error.message : "Paddle Live is disabled.",
      describePaddleConfig().missingNames,
    );
  }
  if (classifyApiKey() !== "sandbox") {
    throw paddleConfigurationError("sandbox API key missing or invalid", describePaddleConfig().missingNames);
  }
  const apiKey = paddleApiKey();
  if (!apiKey) {
    throw paddleConfigurationError("PADDLE_API_KEY missing", ["PADDLE_API_KEY"]);
  }
  return new Paddle(apiKey, SANDBOX_CLIENT_OPTIONS);
}

export function paddleSandboxClientOptions() {
  return SANDBOX_CLIENT_OPTIONS;
}
