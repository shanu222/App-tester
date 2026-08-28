-- Paddle sandbox checkout for the $10 TestLoop package.
-- Unique paddleTransactionId makes duplicate webhooks/syncs idempotent.

ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'PADDLE';

ALTER TABLE "ManagedTestingPayment" ADD COLUMN "paddleTransactionId" TEXT;

CREATE UNIQUE INDEX "ManagedTestingPayment_paddleTransactionId_key"
  ON "ManagedTestingPayment"("paddleTransactionId");

CREATE TABLE "PaddleWebhookEvent" (
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaddleWebhookEvent_pkey" PRIMARY KEY ("eventId")
);
