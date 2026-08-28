-- AlterEnum
ALTER TYPE "ManagedPaymentStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "ManagedPaymentStatus" ADD VALUE 'PROOF_SUBMITTED';
ALTER TYPE "ManagedPaymentStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "ManagedPaymentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ManagedPaymentStatus" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'EASYPAISA';
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'JAZZCASH';
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'SADAPAY';
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'NAYAPAY';
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'BINANCE';
ALTER TYPE "ManagedPaymentProvider" ADD VALUE 'REVENUECAT';
