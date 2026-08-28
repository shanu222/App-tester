-- CreateEnum
CREATE TYPE "PlayEnrollmentStatus" AS ENUM ('NOT_ATTEMPTED', 'PENDING', 'OPEN_OPT_IN', 'ENROLLED', 'VERIFIED', 'UNSUPPORTED', 'FAILED');

-- AlterTable
ALTER TABLE "TestingParticipation" ADD COLUMN "playEnrollmentStatus" "PlayEnrollmentStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED';
ALTER TABLE "TestingParticipation" ADD COLUMN "playEnrolledAt" TIMESTAMP(3);
ALTER TABLE "TestingParticipation" ADD COLUMN "playVerifiedAt" TIMESTAMP(3);
