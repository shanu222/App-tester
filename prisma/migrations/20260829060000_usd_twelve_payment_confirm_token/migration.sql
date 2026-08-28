-- Signed, single-use, expiring email confirmation tokens for the $10 / 12-tester package.
ALTER TABLE "ManagedTestingPayment" ADD COLUMN "confirmTokenHash" TEXT;
ALTER TABLE "ManagedTestingPayment" ADD COLUMN "confirmTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "ManagedTestingPayment" ADD COLUMN "confirmTokenUsedAt" TIMESTAMP(3);
