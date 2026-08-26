/**
 * Auth.js v5 uses AUTH_URL / NEXTAUTH_URL as the Google redirect_uri origin when set.
 * Production is served on three hosts, and the TestLoop Google client already lists
 * a callback for each one. Clear any pinned URL so trustHost uses the request host.
 * This module is imported only from Node Auth.js handlers, not Edge middleware.
 */
try {
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
} catch {
  process.env.AUTH_URL = "";
  process.env.NEXTAUTH_URL = "";
}
process.env.AUTH_TRUST_HOST = "true";
