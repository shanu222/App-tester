import { normalizeEmail } from "@/lib/email-extract";

export type NotificationEmailSeed = {
  notificationEmail: string;
  notificationEmailVerified: true;
};

export type NotificationEmailFields = {
  notificationEmail: string | null;
  notificationEmailVerified?: boolean;
  pendingNotificationEmail?: string | null;
};

export function notificationEmailSeedFromAccount(
  accountEmail: string | null | undefined,
): NotificationEmailSeed | null {
  const email = accountEmail?.trim() ? normalizeEmail(accountEmail) : "";
  if (!email) return null;
  return {
    notificationEmail: email,
    notificationEmailVerified: true,
  };
}

export function shouldSeedDefaultNotificationEmail(
  settings: Pick<NotificationEmailFields, "notificationEmail"> | null | undefined,
) {
  return !settings?.notificationEmail;
}

export function isAuthenticatedAccountEmail(
  accountEmail: string | null | undefined,
  candidate: string | null | undefined,
) {
  if (!accountEmail?.trim() || !candidate?.trim()) return false;
  return normalizeEmail(accountEmail) === normalizeEmail(candidate);
}

export function shouldTrustAccountNotificationEmail(
  settings: NotificationEmailFields | null | undefined,
  accountEmail: string | null | undefined,
) {
  if (!settings?.notificationEmail || settings.notificationEmailVerified) return false;
  return isAuthenticatedAccountEmail(accountEmail, settings.notificationEmail);
}

/**
 * Login email is the default verified destination. Never overwrite a customized
 * notification email when the account email later changes.
 */
export function defaultNotificationEmailUpdate(
  accountEmail: string | null | undefined,
  settings: NotificationEmailFields | null | undefined,
): (NotificationEmailSeed & {
  pendingNotificationEmail?: null;
  notificationEmailVerificationTokenHash?: null;
  notificationEmailVerificationExpiresAt?: null;
}) | null {
  const seed = notificationEmailSeedFromAccount(accountEmail);
  if (!seed) return null;

  const shouldApply =
    shouldSeedDefaultNotificationEmail(settings) ||
    shouldTrustAccountNotificationEmail(settings, accountEmail);
  if (!shouldApply) return null;

  const pendingIsAccount = isAuthenticatedAccountEmail(
    accountEmail,
    settings?.pendingNotificationEmail,
  );
  if (pendingIsAccount) {
    return {
      ...seed,
      pendingNotificationEmail: null,
      notificationEmailVerificationTokenHash: null,
      notificationEmailVerificationExpiresAt: null,
    };
  }
  return seed;
}
