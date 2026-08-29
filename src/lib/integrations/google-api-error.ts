/**
 * Google REST APIs return a consistent error envelope:
 *   { "error": { "code": 403, "status": "PERMISSION_DENIED", "message": "...",
 *                "details": [{ "reason": "SERVICE_DISABLED", ... }] } }
 *
 * Reading it gives a precise cause instead of a generic failure, so keep the
 * parsed values on the response rather than collapsing them into one string.
 */
export type GoogleApiError = {
  httpStatus: number;
  /** Canonical status, e.g. PERMISSION_DENIED or NOT_FOUND. */
  status: string | null;
  /** Fine-grained reason from error.details, e.g. SERVICE_DISABLED. */
  reason: string | null;
  /** Google's own message, already redacted. */
  message: string;
};

type ErrorEnvelope = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
    details?: Array<{ reason?: string; "@type"?: string; metadata?: Record<string, string> }>;
  };
};

const PEM_BLOCK = /-----BEGIN[\s\S]*?-----END[^-]*-----/g;
const LONG_SECRET = /\b[A-Za-z0-9+/_-]{120,}={0,2}\b/g;
const PRIVATE_KEY_JSON = /"private_key"\s*:\s*"(?:\\.|[^"\\])*"/gi;
const CLIENT_EMAIL_JSON = /"client_email"\s*:\s*"(?:\\.|[^"\\])*"/gi;
const PROJECT_ID_JSON = /"project_id"\s*:\s*"(?:\\.|[^"\\])*"/gi;
const SERVICE_ACCOUNT_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com/gi;

/**
 * Strips anything shaped like a private key, service-account JSON field, or
 * bearer token. Google never echoes credentials back, but this guarantees a
 * key can never reach a log or a client even if a message is built from input
 * we did not expect.
 */
export function redactSecrets(value: string) {
  return value
    .replace(PEM_BLOCK, "[redacted key]")
    .replace(PRIVATE_KEY_JSON, '"private_key":"[redacted]"')
    .replace(CLIENT_EMAIL_JSON, '"client_email":"[redacted]"')
    .replace(PROJECT_ID_JSON, '"project_id":"[redacted]"')
    .replace(SERVICE_ACCOUNT_EMAIL, "[redacted account]")
    .replace(LONG_SECRET, "[redacted]");
}

export function serializeErrorForLog(error: unknown) {
  if (error instanceof Error) {
    const stack = error.stack ? `\n${error.stack}` : "";
    return redactSecrets(`${error.name}: ${error.message}${stack}`);
  }
  try {
    return redactSecrets(typeof error === "string" ? error : JSON.stringify(error));
  } catch {
    return "[unserializable error]";
  }
}

export function parseGoogleApiError(httpStatus: number, body: unknown): GoogleApiError {
  const envelope = (body ?? {}) as ErrorEnvelope;
  const error = envelope.error;
  const reason =
    error?.details?.find((detail) => detail.reason)?.reason ??
    error?.errors?.find((item) => item.reason)?.reason ??
    null;

  return {
    httpStatus: error?.code ?? httpStatus,
    status: error?.status ?? null,
    reason,
    message: redactSecrets(error?.message?.trim() || `Google returned HTTP ${httpStatus}.`),
  };
}

/** Reads a JSON body without throwing on an HTML or empty error response. */
export async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: redactSecrets(text.slice(0, 300)) } };
  }
}
