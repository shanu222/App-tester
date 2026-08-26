/**
 * Auth.js reports every non client-safe failure as "Configuration", which hides
 * whether a login broke on the OAuth check, the callback, or the database.
 * The logger records the real error type for the request that is being handled,
 * so the auth route can pass that type on to the login error page.
 */
let lastErrorType: string | null = null;

export function recordAuthError(error: unknown) {
  if (error instanceof Error) {
    const type = (error as Error & { type?: string }).type;
    lastErrorType = type || error.name;
    const cause = (error as Error & { cause?: { err?: unknown } }).cause?.err;
    console.error("[testloop][auth]", lastErrorType, error.message, cause ?? "");
    return;
  }
  lastErrorType = "UnknownError";
  console.error("[testloop][auth] non-error thrown", error);
}

export function takeAuthErrorType() {
  const type = lastErrorType;
  lastErrorType = null;
  return type;
}
