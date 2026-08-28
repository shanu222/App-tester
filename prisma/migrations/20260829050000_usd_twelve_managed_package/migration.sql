-- CreateTable
CREATE TABLE "ManagedFixedPoolEmail" (
    "id" TEXT NOT NULL,
    "packageCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedFixedPoolEmail_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ManagedTestingPayment" ADD COLUMN "fulfillment" JSONB;

-- AlterTable
ALTER TABLE "ManagedTester" ADD COLUMN "reservedPackageCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ManagedFixedPoolEmail_packageCode_email_key" ON "ManagedFixedPoolEmail"("packageCode", "email");

-- CreateIndex
CREATE INDEX "ManagedFixedPoolEmail_packageCode_sortOrder_idx" ON "ManagedFixedPoolEmail"("packageCode", "sortOrder");

-- CreateIndex
CREATE INDEX "ManagedTester_reservedPackageCode_idx" ON "ManagedTester"("reservedPackageCode");

-- Seed the $10 / 12 testers / 14 days package only. Existing PKR packages are unchanged.
INSERT INTO "ManagedTestingPackage" ("id", "code", "name", "testerCount", "amountPkr", "currency", "contactOnly", "active", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'pkg_usd_12_14',
  'usd_12_14',
  'TestLoop 12-Testers / 14-Day Managed Testing',
  12,
  10,
  'USD',
  false,
  true,
  5,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "ManagedFixedPoolEmail" ("id", "packageCode", "email", "sortOrder", "createdAt")
VALUES
  ('pool_usd12_01', 'usd_12_14', 'shanu1998end@gmail.com', 1, CURRENT_TIMESTAMP),
  ('pool_usd12_02', 'usd_12_14', 'bendcreteengineeringservices@gmail.com', 2, CURRENT_TIMESTAMP),
  ('pool_usd12_03', 'usd_12_14', 'ndma2026@gmail.com', 3, CURRENT_TIMESTAMP),
  ('pool_usd12_04', 'usd_12_14', 'rauarsalan@gmail.com', 4, CURRENT_TIMESTAMP),
  ('pool_usd12_05', 'usd_12_14', 'touqeer6124@gmail.com', 5, CURRENT_TIMESTAMP),
  ('pool_usd12_06', 'usd_12_14', 'shahnawaz991374balouch@gmail.com', 6, CURRENT_TIMESTAMP),
  ('pool_usd12_07', 'usd_12_14', 'shahnawaz9974balouch@gmail.com', 7, CURRENT_TIMESTAMP),
  ('pool_usd12_08', 'usd_12_14', 'shanuend0@gmail.com', 8, CURRENT_TIMESTAMP),
  ('pool_usd12_09', 'usd_12_14', 'asadbaloch225@gmail.com', 9, CURRENT_TIMESTAMP),
  ('pool_usd12_10', 'usd_12_14', 'asadullahbaloch7865@gmail.com', 10, CURRENT_TIMESTAMP),
  ('pool_usd12_11', 'usd_12_14', 'salahuddinlundbaloch1996@gmail.com', 11, CURRENT_TIMESTAMP),
  ('pool_usd12_12', 'usd_12_14', 'alwayshero076@gmail.com', 12, CURRENT_TIMESTAMP);
