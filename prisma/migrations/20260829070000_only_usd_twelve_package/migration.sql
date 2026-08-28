-- Hide PKR 12/20/30/50 and Custom packages from purchase. Keep rows for existing payments.
UPDATE "ManagedTestingPackage"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('testers_12', 'testers_20', 'testers_30', 'testers_50', 'custom');

UPDATE "ManagedTestingPackage"
SET "name" = '12 Testers — $10 USD — 14 Days', "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'usd_12_14';
