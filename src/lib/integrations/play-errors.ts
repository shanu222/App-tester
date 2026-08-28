import { parseGoogleApiError, redactSecrets } from "@/lib/integrations/google-api-error";

export const PLAY_USER_ERRORS = {
  AUTH_EXPIRED:
    "TestLoop could not access this Play Console account. Verify that the connected account or service account has the required Google Play Developer API permissions.",
  INSUFFICIENT_PERMISSIONS:
    "The connected Google account does not have sufficient access to this Play Console application.",
  APP_INACCESSIBLE: "This app is no longer accessible through the connected Play Console account.",
  API_UNAVAILABLE: "Google Play did not return this information. No changes were made.",
  UNSUPPORTED:
    "Google Play does not expose this operation through the current API connection. TestLoop has not claimed the action in Google Play.",
} as const;

type MappedPlayError = {
  message: string;
  code: string;
};

function errorText(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

/**
 * Turn a Google / network failure into a safe, specific developer-facing message.
 * Technical details stay in server logs; the returned text never includes secrets.
 */
export function mapPlayFailure(error: unknown, fallback: string): MappedPlayError {
  const gaxios = error as {
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };
  const httpStatus = gaxios?.response?.status;
  const parsed = gaxios?.response?.data
    ? parseGoogleApiError(httpStatus ?? 0, gaxios.response.data)
    : null;
  const blob = redactSecrets(
    [parsed?.message, parsed?.status, parsed?.reason, errorText(error), gaxios?.code]
      .filter(Boolean)
      .join(" "),
  );

  if (
    httpStatus === 401 ||
    parsed?.status === "UNAUTHENTICATED" ||
    /invalid_grant|unauthenticated|unauthorized/i.test(blob)
  ) {
    return { message: PLAY_USER_ERRORS.AUTH_EXPIRED, code: "PLAY_AUTH_EXPIRED" };
  }

  if (
    httpStatus === 404 ||
    parsed?.status === "NOT_FOUND" ||
    /package.*not found|app.*not found|404/i.test(blob)
  ) {
    return { message: PLAY_USER_ERRORS.APP_INACCESSIBLE, code: "PLAY_APP_INACCESSIBLE" };
  }

  if (parsed?.reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(blob)) {
    return {
      message: parsed?.message || fallback,
      code: "PLAY_REPORTING_NOT_ENABLED",
    };
  }

  if (
    httpStatus === 403 ||
    parsed?.status === "PERMISSION_DENIED" ||
    /permission_denied|insufficient|forbidden/i.test(blob)
  ) {
    return { message: PLAY_USER_ERRORS.INSUFFICIENT_PERMISSIONS, code: "PLAY_PERMISSIONS" };
  }

  if (
    httpStatus === 501 ||
    parsed?.status === "UNIMPLEMENTED" ||
    /not (currently )?support|unimplemented/i.test(blob)
  ) {
    return { message: PLAY_USER_ERRORS.UNSUPPORTED, code: "PLAY_UNSUPPORTED" };
  }

  if (
    (httpStatus && httpStatus >= 500) ||
    parsed?.status === "UNAVAILABLE" ||
    /econnreset|etimedout|enotfound|fetch failed|503|unavailable/i.test(blob)
  ) {
    return { message: PLAY_USER_ERRORS.API_UNAVAILABLE, code: "PLAY_UNAVAILABLE" };
  }

  return {
    message: redactSecrets(parsed?.message || fallback),
    code: "PLAY_ERROR",
  };
}
