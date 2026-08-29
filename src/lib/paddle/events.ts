export const PADDLE_FULFILLMENT_EVENTS = ["transaction.completed", "transaction.paid"] as const;

export type PaddleFulfillmentEvent = (typeof PADDLE_FULFILLMENT_EVENTS)[number];

export function isPaddleFulfillmentEvent(eventType: string | null | undefined) {
  return eventType === "transaction.completed" || eventType === "transaction.paid";
}

export function paddleCheckoutCreateBody(input: { priceId: string; paymentPublicId: string; packageCode: string }) {
  return {
    items: [{ priceId: input.priceId, quantity: 1 as const }],
    collectionMode: "automatic" as const,
    customData: {
      paymentPublicId: input.paymentPublicId,
      packageCode: input.packageCode,
    },
  };
}

export async function createSandboxCheckoutTransaction(
  paddle: { transactions: { create: (body: ReturnType<typeof paddleCheckoutCreateBody>) => Promise<{ id: string }> } },
  input: { priceId: string; paymentPublicId: string; packageCode: string },
) {
  const transaction = await paddle.transactions.create(paddleCheckoutCreateBody(input));
  return { transactionId: transaction.id };
}
