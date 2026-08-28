import { EventName } from "@paddle/paddle-node-sdk";
import { json } from "@/lib/http";
import { getPaddleSandboxClient } from "@/lib/paddle/client";
import { paddleWebhookConfigured, paddleWebhookSecret } from "@/lib/paddle/config";
import {
  fulfillVerifiedPaddleTransaction,
  paddleWebhookAlreadyProcessed,
  recordPaddleWebhookEvent,
} from "@/lib/paddle/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return json({ error: "Missing signature or body" }, 400);
  }
  if (!paddleWebhookConfigured()) {
    return json({ error: "Paddle webhook is not configured" }, 500);
  }
  const secret = paddleWebhookSecret();

  try {
    const paddle = getPaddleSandboxClient();
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    if (!event) {
      return json({ error: "Invalid event" }, 500);
    }
    if (await paddleWebhookAlreadyProcessed(event.eventId)) {
      return json({ received: true, duplicate: true });
    }

    if (
      event.eventType === EventName.TransactionCompleted ||
      event.eventType === EventName.TransactionPaid
    ) {
      await fulfillVerifiedPaddleTransaction(event.data);
    }

    await recordPaddleWebhookEvent(event.eventId, event.eventType);
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.name : "error";
    console.error("Paddle webhook failed", { name: message });
    return json({ error: "Internal error" }, 500);
  }
}
