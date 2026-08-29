import { json } from "@/lib/http";
import { getPaddleSandboxClient } from "@/lib/paddle/client";
import { paddleWebhookConfigured, paddleWebhookSecret, describePaddleConfig } from "@/lib/paddle/config";
import { isPaddleFulfillmentEvent } from "@/lib/paddle/events";
import { logPaddleFailure } from "@/lib/paddle/api-error";
import { logDatabaseError, prismaErrorCode } from "@/lib/errors";
import {
  fulfillVerifiedPaddleTransaction,
  paddleWebhookAlreadyProcessed,
  recordPaddleWebhookEvent,
} from "@/lib/paddle/fulfill";
import type { PaddleTransactionLike } from "@/lib/paddle/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    logPaddleFailure("VALIDATION_ERROR", { reason: "missing signature or body" });
    return json({ error: "Missing signature or body", code: "VALIDATION_ERROR" }, 400);
  }
  if (!paddleWebhookConfigured()) {
    logPaddleFailure("PADDLE_CONFIGURATION_ERROR", {
      missing: describePaddleConfig().missingNames.join(","),
    });
    return json({ error: "Paddle webhook is not configured", code: "PADDLE_CONFIGURATION_ERROR" }, 500);
  }
  const secret = paddleWebhookSecret();

  try {
    const paddle = getPaddleSandboxClient();
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    if (!event) {
      logPaddleFailure("VALIDATION_ERROR", { reason: "invalid event" });
      return json({ error: "Invalid event", code: "VALIDATION_ERROR" }, 500);
    }
    if (await paddleWebhookAlreadyProcessed(event.eventId)) {
      return json({ received: true, duplicate: true });
    }

    if (isPaddleFulfillmentEvent(event.eventType)) {
      await fulfillVerifiedPaddleTransaction(event.data as PaddleTransactionLike);
    }

    await recordPaddleWebhookEvent(event.eventId, event.eventType);
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/signature/i.test(message)) {
      logPaddleFailure("VALIDATION_ERROR", { reason: "signature verification failed" });
      return json({ error: "Internal error", code: "VALIDATION_ERROR" }, 500);
    }
    if (prismaErrorCode(error)) {
      logDatabaseError("paddle.webhook", error);
      return json({ error: "Internal error", code: "DATABASE_ERROR" }, 500);
    }
    logPaddleFailure("PADDLE_TRANSACTION_CREATION_ERROR", { name: error instanceof Error ? error.name : "error" });
    return json({ error: "Internal error" }, 500);
  }
}
