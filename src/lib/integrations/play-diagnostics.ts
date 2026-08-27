import { JWT } from "google-auth-library";
import {
  parseGoogleApiError,
  readJsonBody,
  redactSecrets,
  type GoogleApiError,
} from "@/lib/integrations/google-api-error";
import { ANDROID_PUBLISHER_SCOPE } from "@/lib/integrations/play-scopes";

export { ANDROID_PUBLISHER_SCOPE };
const API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

/**
 * Android Publisher v3 has no account-level "list my apps" endpoint, so the only
 * way to ask Play whether it recognises these credentials is to request a
 * resource under some package. We POST edits.insert against a package nobody
 * owns and read the *error class*:
 *
 * - 401/403 — the account was never invited to Play Console (or lacks permission)
 * - 404     — Play accepted the credentials and merely cannot find the package
 *
 * A GET against a made-up edit id does not work: Google validates the edit-id
 * format first and returns HTTP 400 INVALID_ARGUMENT ("Invalid edit ID"), which
 * is not a Play Console ACL signal.
 *
 * Never treat the dummy-package probe as evidence about a real app. If insert
 * unexpectedly succeeds on a real package, the uncommitted edit is deleted
 * immediately so nothing is published.
 */
const PROBE_PACKAGE = "com.testloop.connectioncheck";

export type PlayErrorCode =
  | "PLAY_NOT_CONNECTED"
  | "PLAY_CREDENTIALS_UNREADABLE"
  | "INVALID_SERVICE_ACCOUNT_JSON"
  | "SERVICE_ACCOUNT_AUTH_FAILED"
  | "OAUTH_AUTH_FAILED"
  | "PLAY_API_NOT_ENABLED"
  | "PLAY_CONSOLE_NOT_LINKED"
  | "PLAY_CONSOLE_INSUFFICIENT_PERMISSIONS"
  | "PLAY_PACKAGE_NOT_FOUND"
  | "PLAY_QUOTA_EXCEEDED"
  | "PLAY_API_UNAVAILABLE"
  | "PLAY_NETWORK_ERROR"
  | "PLAY_STORE_FAILED"
  | "PLAY_UNEXPECTED_RESPONSE";

/** Safe to return to the browser and to log: no key material, no tokens. */
export type PlayDiagnostics = {
  connected: boolean;
  method: "SERVICE_ACCOUNT" | "OAUTH";
  /** The authorising account: a service account email, or the developer's Google account. */
  accountEmail: string | null;
  /** Populated only for service-account connections. */
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

/**
 * Ask Play whether this account can see `packageName` by attempting to open an
 * uncommitted edit. Uncommitted edits expire on their own; if insert succeeds we
 * still delete it so the Console is left unchanged.
 */
async function probeEdit(accessToken: string, packageName: string): Promise<ProbeOutcome> {
  const editsUrl = `${API_BASE}/applications/${encodeURIComponent(packageName)}/edits`;
  let response: Response;
  try {
    response = await fetch(editsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
  } catch (cause) {
    const message = cause instanceof Error ? redactSecrets(cause.message) : "Request failed.";
    return { kind: "network", message: `Could not reach androidpublisher.googleapis.com: ${message}` };
  }
  if (response.ok) {
    const body = (await readJsonBody(response)) as { id?: unknown };
    const editId = typeof body.id === "string" ? body.id : null;
    if (editId) {
      await fetch(`${editsUrl}/${encodeURIComponent(editId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }).catch(() => undefined);
    }
    return { kind: "ok" };
  }
  return { kind: "google", error: parseGoogleApiError(response.status, await readJsonBody(response)) };
}

function isServiceDisabled(error: GoogleApiError) {
  return (
    error.reason === "SERVICE_DISABLED" ||
    /has not been used in project|is disabled|enable it by visiting/i.test(error.message)
  );
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
function classify(error: GoogleApiError, method: PlayIdentity["method"] = "SERVICE_ACCOUNT"): Verdict {
  const isServiceAccount = method === "SERVICE_ACCOUNT";

  if (isServiceDisabled(error)) {
    return {
      code: "PLAY_API_NOT_ENABLED",
      message: isServiceAccount
        ? "The Google Play Android Developer API is not enabled for this service account's Google Cloud project. Enable it at console.cloud.google.com → APIs & Services → Library → Google Play Android Developer API, then retry."
        : "The Google Play Android Developer API is not enabled for the Google Cloud project behind TestLoop's OAuth client. Enable it at console.cloud.google.com → APIs & Services → Library → Google Play Android Developer API, then retry.",
      apiReachable: false,
      playConsoleAuthorized: false,
    };
  }

  if (error.httpStatus === 401) {
    return {
      code: "PLAY_CONSOLE_NOT_LINKED",
      message: isServiceAccount
        ? "The service account signed in to Google, but Play Console does not grant it access to any app. In Play Console → Users and permissions, invite this service account's email and give it access to your app, then retry."
        : "Google accepted the sign-in, but this Google account has no Play Console access. Sign in with the account that holds your Play Developer account, or have an admin invite it under Play Console → Users and permissions.",
      apiReachable: true,
      playConsoleAuthorized: false,
    };
  }

  if (error.httpStatus === 403) {
    return {
      code: "PLAY_CONSOLE_INSUFFICIENT_PERMISSIONS",
      message: isServiceAccount
        ? "Google denied permission. The service account is known but lacks the Play Console permissions this needs. Grant it at least release and testing permissions on the app in Play Console → Users and permissions."
        : "Google denied permission. This Google account is known to Play Console but lacks the permissions this needs. Grant it at least release and testing permissions under Play Console → Users and permissions.",
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

/** Who is authorising, independent of how the token was minted. */
type PlayIdentity = {
  method: "SERVICE_ACCOUNT" | "OAUTH";
  email: string | null;
  projectId: string | null;
};

function baseResult(identity: PlayIdentity, packageName?: string): PlayDiagnostics {
  return {
    connected: false,
    method: identity.method,
    accountEmail: identity.email,
    serviceAccountEmail: identity.method === "SERVICE_ACCOUNT" ? identity.email : null,
    projectId: identity.projectId,
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
  const identity: PlayIdentity = {
    method: "SERVICE_ACCOUNT",
    email: sa.clientEmail,
    projectId: sa.projectId,
  };

  let accessToken: string;
  try {
    accessToken = await requestAccessToken(sa);
  } catch (cause) {
    return {
      ...baseResult(identity, packageName),
      errorCode: "SERVICE_ACCOUNT_AUTH_FAILED",
      errorMessage: describeTokenError(cause),
    };
  }

  return diagnoseWithToken(identity, accessToken, packageName);
}

/**
 * Same read-only checks for a developer who authorised over OAuth. The token is
 * minted by the caller so this module stays free of OAuth client wiring.
 */
export async function runPlayOAuthDiagnostics(
  input: { email: string | null; mintAccessToken: () => Promise<string | null> },
  packageName?: string,
): Promise<PlayDiagnostics> {
  const identity: PlayIdentity = { method: "OAUTH", email: input.email, projectId: null };

  let accessToken: string | null;
  try {
    accessToken = await input.mintAccessToken();
  } catch (cause) {
    return {
      ...baseResult(identity, packageName),
      errorCode: "OAUTH_AUTH_FAILED",
      errorMessage: describeOAuthError(cause),
    };
  }
  if (!accessToken) {
    return {
      ...baseResult(identity, packageName),
      errorCode: "OAUTH_AUTH_FAILED",
      errorMessage:
        "Google Play authorisation has expired or was revoked. Reconnect Google Play to grant access again.",
    };
  }

  return diagnoseWithToken(identity, accessToken, packageName);
}

/** Turns a refresh-token failure into something the developer can act on. */
function describeOAuthError(error: unknown): string {
  const gaxios = error as {
    response?: { data?: { error?: string; error_description?: string } };
    message?: string;
  };
  const oauthError = gaxios.response?.data?.error;
  if (oauthError === "invalid_grant") {
    return "Google Play authorisation is no longer valid: the developer revoked access or the grant expired. Reconnect Google Play.";
  }
  if (oauthError === "invalid_client") {
    return "Google rejected TestLoop's OAuth client credentials. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.";
  }
  const message = typeof gaxios.message === "string" ? redactSecrets(gaxios.message) : "";
  return `Google Play authorisation failed${message ? `: ${message}` : "."}`;
}

async function diagnoseWithToken(
  identity: PlayIdentity,
  accessToken: string,
  packageName?: string,
): Promise<PlayDiagnostics> {
  const result = baseResult(identity, packageName);

  const probe = await probeEdit(accessToken, PROBE_PACKAGE);
  if (probe.kind === "network") {
    return { ...result, errorCode: "PLAY_NETWORK_ERROR", errorMessage: probe.message };
  }

  if (probe.kind === "google") {
    // A 404 is the success signal here: Play accepted the credentials and only
    // failed to find the deliberately nonexistent probe package.
    if (probe.error.httpStatus !== 404) {
      const verdict = classify(probe.error, identity.method);
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
      detail: `Authenticated as ${identity.email ?? "the authorised account"}. The Google Play Developer API is enabled and Play Console accepts this connection. Add a package name to verify access to a specific app.`,
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

  if (appProbe.kind === "ok") {
    return {
      ...reachable,
      connected: true,
      checkedPackageName: target,
      packageAccessible: true,
      detail: `Verified. Authenticated as ${identity.email ?? "the authorised account"} and confirmed read access to ${target} through the Google Play Developer API.`,
    };
  }

  if (appProbe.kind === "google") {
    const error = appProbe.error;
    if (error.httpStatus === 404 || mentionsMissingPackage(error)) {
      return {
        ...withGoogleError(reachable, error),
        checkedPackageName: target,
        packageAccessible: false,
        errorCode: "PLAY_PACKAGE_NOT_FOUND",
        errorMessage: `Google Play does not expose "${target}" to this connection. Check the package name, confirm the app exists in this Play Console account, and grant the authorised account access to it.`,
      };
    }
    const verdict = classify(error, identity.method);
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

  return {
    ...reachable,
    connected: true,
    checkedPackageName: target,
    packageAccessible: true,
    detail: `Verified. Authenticated as ${identity.email ?? "the authorised account"} and confirmed read access to ${target} through the Google Play Developer API.`,
  };
}
