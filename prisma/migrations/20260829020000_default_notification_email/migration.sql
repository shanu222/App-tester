-- Existing accounts: use the authenticated login email as the verified
-- notification destination when none is set. Do not overwrite a customized address.

UPDATE "UserSettings" AS s
SET
  "notificationEmail" = lower(u.email),
  "notificationEmailVerified" = true,
  "pendingNotificationEmail" = NULL,
  "notificationEmailVerificationTokenHash" = NULL,
  "notificationEmailVerificationExpiresAt" = NULL
FROM "User" AS u
WHERE s."userId" = u.id
  AND s."pendingNotificationEmail" IS NOT NULL
  AND lower(s."pendingNotificationEmail") = lower(u.email);

UPDATE "UserSettings" AS s
SET
  "notificationEmail" = lower(u.email),
  "notificationEmailVerified" = true
FROM "User" AS u
WHERE s."userId" = u.id
  AND s."notificationEmail" IS NULL
  AND u.email IS NOT NULL
  AND u.email <> '';

UPDATE "UserSettings" AS s
SET "notificationEmailVerified" = true
FROM "User" AS u
WHERE s."userId" = u.id
  AND s."notificationEmailVerified" = false
  AND s."notificationEmail" IS NOT NULL
  AND lower(s."notificationEmail") = lower(u.email);
