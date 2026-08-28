import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";
import { AppError } from "@/lib/errors";
import { assertPaddleSandboxOnly, paddleApiKey } from "@/lib/paddle/config";

export function getPaddleSandboxClient() {
  try {
    assertPaddleSandboxOnly();
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Paddle Live is disabled.",
      503,
      "PADDLE_LIVE_DISABLED",
    );
  }
  const apiKey = paddleApiKey();
  if (!apiKey) {
    throw new AppError("Paddle sandbox is not configured on this server.", 503, "PADDLE_NOT_CONFIGURED");
  }
  return new Paddle(apiKey, {
    environment: Environment.sandbox,
    logLevel: LogLevel.error,
  });
}
