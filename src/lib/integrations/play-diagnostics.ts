import { JWT } from "google-auth-library";
import {
  parseGoogleApiError,
  readJsonBody,
  redactSecrets,
  type GoogleApiError,
} from "@/lib/integrations/google-api-error";

export const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

/**
 * Android Publisher v3 has no account-level "list my apps" endpoint, so the only
 * way to ask Play whether it recognises these credentials is to request a
 * resource under some package. We use a package nobody owns and read the *error
 * class*: Play answers 401 when the service account was never invited to the
 * Play Console, but 404 once it is invited and merely cannot find the package.
 * Never treat this probe as evidence about a real app.
 */
const PROBE_PACKAGE = "com.testloop.connectioncheck";
/** Any edit id works; we expect "not found" and only care which error arrives. */
const PROBE_EDIT_ID = "testloop-readonly-probe";

export type PlayErrorCode =
  | "PLAY_NOT_CONNECTED"
  | "PLAY_CREDENTIALS_UNREADABLE"
  | "INVALID_SERVICE_ACCOUNT_JSON"
  | "SERVICE_ACCOUNT_AUTH_FAILED"
  | "PLAY_API_NOT_ENABLED"
  | "PLAY_CONSOLE_NOT_LINKED"
  | "PLAY_CONSOLE_INSUFFICIENT_PERMISSIONS"
  | "PLAY_PACKAGE_NOT_FOUND"
  | "PLAY_QUOTA_EXCEEDED"
  | "PLAY_API_UNAVAILABLE"
  | "PLAY_NETWORK_ERROR"
  | "PLAY_UNEXPECTED_RESPONSE";

/** Safe to return to the browser and to log: no key material, no tokens. */
export type PlayDiagnostics = {
  connected: boolean;
  serviceAccountEmail: string | null;
  projectId: string | null;
  apiReachable: boolean;
  playConsoleAuthorized: boolean;
  packageAccessible: boolean | null;
  errorCode: PlayErrorCode | null;
  errorMessage: string | null;
  /** Google's own status/reason, kept so the cause is never guessed at. */
  googleStatus: string | null;
  googleReason: string | null;
  googleMessage: string | null;
  httpStatus: number | null;
  checkedPackageName: string | null;
  scope: string;
  detail: string | null;
  checkedAt: string;
};

export type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  projectId: string | null;
  privateKeyId: string | null;
  tokenUri: string | null;
};

/**
 * Validates the pasted key without ever putting its contents in an error
 * message. Only structural facts are reported back.
 */
export function parseServiceAccount(
  raw: string,
): { ok: true; serviceAccount: ServiceAccount } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Paste the service account JSON key." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      message:
        "Invalid service-account JSON: the text is not valid JSON. Download the key again from Google Cloud Console → IAM & Admin → Service Accounts → Keys and paste the whole file.",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: "Invalid service-account JSON: expected a JSON object." };
  }

  const record = parsed as Record<string, unknown>;
  const stringField = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");

  if (stringField("type") !== "service_account") {
    const kind = stringField("type");
    return {
      ok: false,
      message: kind
        ? `Invalid service-account JSON: "type" is "${kind}" but must be "service_account". An OAuth client secret file will not work here.`
        : 'Invalid service-account JSON: the "type" field is missing. This must be a service account key, not an OAuth client secret.',
    };
  }

  const clientEmail = stringField("client_email");
  if (!clientEmail.includes("@")) {
    return { ok: false, message: 'Invalid service-account JSON: "client_email" is missing or malformed.' };
  }

  // JSON keys store newlines escaped. A key pasted through a shell or a form can
  // arrive double-escaped, which makes the PEM unparseable, so normalise it.
  const privateKey = (typeof record.private_key === "string" ? record.private_key : "").replace(/\\n/g, "\n");
  if (!privateKey.includes("-----BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    return {
      ok: false,
      message:
        'Invalid service-account JSON: "private_key" is missing or is not a PEM block. Use the JSON key file exactly as downloaded.',
    };
  }

  return {
    ok: true,
    serviceAccount: {
      clientEmail,
      privateKey,
      projectId: stringField("project_id") || null,
      privateKeyId: stringField("private_key_id") || null,
      tokenUri: stringField("token_uri") || null,
    },
  };
}

/** Turns a google-auth-library token failure into a cause the user can act on. */
function describeTokenError(error: unknown): string {
  const gaxios = error as {
    response?: { data?: { error?: string; error_description?: string } };
    message?: string;
  };
  const oauthError = gaxios.response?.data?.error;
  const description = gaxios.response?.data?.error_description;

  if (oauthError === "invalid_grant") {
    return "Service account authentication failed: Google rejected the key (invalid_grant). The key may have been deleted or disabled in Google Cloud Console, or this server's clock may be wrong.";
  }
  if (oauthError === "invalid_client") {
    return "Service account authentication failed: Google does not recognise this service account (invalid_client). It may have been deleted.";
  }
  if (oauthError) {
    return `Service account authentication failed: ${redactSecrets(`${oauthError}${description ? ` — ${description}` : ""}`)}`;
  }
  const message = typeof gaxios.message === "string" ? redactSecrets(gaxios.message) : "";
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|fetch failed/i.test(message)) {
    return `Google API network error while requesting an access token: ${message}`;
  }
  return `Service account authentication failed${message ? `: ${message}` : "."}`;
}

async function requestAccessToken(sa: ServiceAccount) {
  const client = new JWT({
    email: sa.clientEmail,
    key: sa.privateKey,
    scopes: [ANDROID_PUBLISHER_SCOPE],
    ...(sa.tokenUri ? { additionalClaims: {} } : {}),
  });
  const credentials = await client.authorize();
  if (!credentials.access_token) {
    throw new Error("Google returned no access token for this service account.");
  }
  return credentials.access_token;
}

type ProbeOutcome =
  | { kind: "ok" }
  | { kind: "google"; error: GoogleApiError }
  | { kind: "network"; message: string };

/** Read-only GET. Never creates, mutates, or commits anything in Play Console. */
async function probeEdit(accessToken: string, packageName: string): Promise<ProbeOutcome> {
  const url = `${API_BASE}/applications/${encodeURIComponent(packageName)}/edits/${PROBE_EDIT_ID}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (cause) {
    const message = cause instanceof Error ? redactSecrets(cause.message) : "Request failed.";
    return { kind: "network", message: `Could not reach androidpublisher.googleapis.com: ${message}` };
  }
  if (response.ok) return { kind: "ok" };
  return { kind: "google", error: parseGoogleApiError(response.status, await readJsonBody(response)) };
}

function isServiceDisabled(error: GoogleApiError) {
  return (
    error.reason === "SERVICE_DISABLED" ||
    /has not been used in project|is disabled|enable it by visiting/i.test(error.message)
  );
}

function mentionsMissingEdit(error: GoogleApiError) {
  return /edit(\s|id)?.*not\s*found|editid|no such edit/i.test(error.message);
}

function mentionsMissingPackage(error: GoogleApiError) {
  return /package not found|application not found|no such package|package name.*not.*found/i.test(error.message);
}

type Verdict = {
  code: PlayErrorCode;
  message: string;
  apiReachable: boolean;
  playConsoleAuthorized: boolean;
};

/** Maps a Google error onto one actionable cause. */
function classify(error: GoogleApiError): Verdict {
  if (isServiceDisabled(error)) {
    return {
      code: "PLAY_API_NOT_ENABLED",
      message:
        "The Google Play Android Developer API is not enabled for this service account's Google Cloud project. Enable it at console.cloud.google.com → APIs & Services → Library → Google Play Android Developer API, then retry.",
      apiReachable: false,
      playConsoleAuthorized: false,
    };
  }

  if (error.httpStatus === 401) {
    return {
      code: "PLAY_CONSOLE_NOT_LINKED",
      message:
        "The service account signed in to Google, but Play Console does not grant it access to any app. In Play Console → Users and permissions, invite this service account's email and give it access to your app, then retry.",
      apiReachable: true,
      playConsoleAuthorized: false,
    };
  }

  if (error.httpStatus === 403) {
    return {
      code: "PLAY_CONSOLE_INSUFFICIENT_PERMISSIONS",
      message:
        "Google denied permission. The service account is known but lacks the Play Console permissions this needs. Grant it at least release and testing permissions on the app in Play Console → Users and permissions.",
      apiReachable: true,
      playConsoleAuthorized: false,
    };
  }

  if (error.httpStatus === 429) {
    return {
      code: "PLAY_QUOTA_EXCEEDED",
      message: "Google Play API quota exceeded. Wait a few minutes and retry.",
      apiReachable: true,
      playConsoleAuthorized: true,
    };
  }

  if (error.httpStatus >= 500) {
    return {
      code: "PLAY_API_UNAVAILABLE",
      message: "The Google Play Developer API is temporarily unavailable. Retry shortly.",
      apiReachable: false,
      playConsoleAuthorized: false,
    };
  }

  return {
    code: "PLAY_UNEXPECTED_RESPONSE",
    message: `Unexpected response from the Google Play Developer API (HTTP ${error.httpStatus}).`,
    apiReachable: true,
    playConsoleAuthorized: false,
  };
}

function baseResult(sa: ServiceAccount, packageName?: string): PlayDiagnostics {
  return {
    connected: false,
    serviceAccountEmail: sa.clientEmail,
    projectId: sa.projectId,
    apiReachable: false,
    playConsoleAuthorized: false,
    packageAccessible: packageName ? false : null,
    errorCode: null,
    errorMessage: null,
    googleStatus: null,
    googleReason: null,
    googleMessage: null,
    httpStatus: null,
    checkedPackageName: packageName ?? null,
    scope: ANDROID_PUBLISHER_SCOPE,
    detail: null,
    checkedAt: new Date().toISOString(),
  };
}

function withGoogleError(result: PlayDiagnostics, error: GoogleApiError): PlayDiagnostics {
  return {
    ...result,
    googleStatus: error.status,
    googleReason: error.reason,
    googleMessage: error.message,
    httpStatus: error.httpStatus,
  };
}

/**
 * Read-only end-to-end check of a Play service account.
 *
 * 1. Mint an access token for the androidpublisher scope (proves the key works).
 * 2. Probe Android Publisher to see whether the API is enabled and whether Play
 *    Console recognises the service account.
 * 3. If a package name is given, confirm that specific app is reachable.
 *
 * Nothing is written to Play Console and no credential material is returned.
 */
export async function runPlayDiagnostics(
  sa: ServiceAccount,
  packageName?: string,
): Promise<PlayDiagnostics> {
  const result = baseResult(sa, packageName);

  let accessToken: string;
  try {
    accessToken = await requestAccessToken(sa);
  } catch (cause) {
    return {
      ...result,
      errorCode: "SERVICE_ACCOUNT_AUTH_FAILED",
      errorMessage: describeTokenError(cause),
    };
  }

  const probe = await probeEdit(accessToken, PROBE_PACKAGE);
  if (probe.kind === "network") {
    return { ...result, errorCode: "PLAY_NETWORK_ERROR", errorMessage: probe.message };
  }

  if (probe.kind === "google") {
    // A 404 is the success signal here: Play accepted the credentials and only
    // failed to find the deliberately nonexistent probe package.
    if (probe.error.httpStatus !== 404) {
      const verdict = classify(probe.error);
      return {
        ...withGoogleError(result, probe.error),
        apiReachable: verdict.apiReachable,
        playConsoleAuthorized: verdict.playConsoleAuthorized,
        errorCode: verdict.code,
        errorMessage: verdict.message,
      };
    }
  }

  const reachable: PlayDiagnostics = {
    ...result,
    apiReachable: true,
    playConsoleAuthorized: true,
  };

  if (!packageName?.trim()) {
    return {
      ...reachable,
      connected: true,
      packageAccessible: null,
      detail: `Authenticated as ${sa.clientEmail}. The Google Play Developer API is enabled and Play Console accepts this service account. Add a package name to verify access to a specific app.`,
    };
  }

  const target = packageName.trim();
  const appProbe = await probeEdit(accessToken, target);

  if (appProbe.kind === "network") {
    return {
      ...reachable,
      checkedPackageName: target,
      errorCode: "PLAY_NETWORK_ERROR",
      errorMessage: appProbe.message,
    };
  }

  if (appProbe.kind === "google") {
    const error = appProbe.error;
    const accessible = error.httpStatus === 404 && mentionsMissingEdit(error) && !mentionsMissingPackage(error);

    if (!accessible) {
      if (error.httpStatus === 404) {
        return {
          ...withGoogleError(reachable, error),
          checkedPackageName: target,
          packageAccessible: false,
          errorCode: "PLAY_PACKAGE_NOT_FOUND",
          errorMessage: `Google Play does not expose "${target}" to this service account. Check the package name, confirm the app exists in this Play Console account, and grant the service account access to it.`,
        };
      }
      const verdict = classify(error);
      return {
        ...withGoogleError(reachable, error),
        checkedPackageName: target,
        packageAccessible: false,
        apiReachable: verdict.apiReachable,
        playConsoleAuthorized: verdict.playConsoleAuthorized,
        errorCode: verdict.code,
        errorMessage: verdict.message,
      };
    }
  }

  return {
    ...reachable,
    connected: true,
    checkedPackageName: target,
    packageAccessible: true,
    detail: `Verified. Authenticated as ${sa.clientEmail} and confirmed read access to ${target} through the Google Play Developer API.`,
  };
}
