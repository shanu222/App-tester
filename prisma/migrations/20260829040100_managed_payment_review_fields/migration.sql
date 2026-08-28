-- CreateEnum
CREATE TYPE "ManagedPaymentMethod" AS ENUM ('EASYPAISA', 'JAZZCASH', 'SADAPAY', 'NAYAPAY', 'BINANCE_USDT', 'REVENUECAT');

-- AlterTable
ALTER TABLE "ManagedTestingPayment" ADD COLUMN "method" "ManagedPaymentMethod",
ADD COLUMN "developerReference" TEXT,
ADD COLUMN "proofBytes" BYTEA,
ADD COLUMN "proofMime" TEXT,
ADD COLUMN "proofFileName" TEXT,
ADD COLUMN "proofUploadedAt" TIMESTAMP(3),
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "adminNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "ManagedTestingPayment" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- CreateIndex
CREATE INDEX "ManagedTestingPayment_reviewedById_idx" ON "ManagedTestingPayment"("reviewedById");

-- AddForeignKey
ALTER TABLE "ManagedTestingPayment" ADD CONSTRAINT "ManagedTestingPayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
