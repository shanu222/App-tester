/**
 * Auth.js v5 uses AUTH_URL as the Google redirect_uri origin when set.
 * Never pin a canonical production host. Bind to the current request origin
 * so www.testloop.org and app-tester-three.vercel.app each keep their own callback.
 */
export function firstForwardedValue(value: string | null | undefined) {
  return (value || "").split(",")[0].trim();
}

export function originFromHeaders(headerStore: { get(name: string): string | null }) {
  const host = firstForwardedValue(headerStore.get("x-forwarded-host") || headerStore.get("host"));
  const proto = firstForwardedValue(headerStore.get("x-forwarded-proto")) || "https";
  if (!host) return "";
  return `${proto.replace(/:$/, "")}://${host}`;
}

export function sanitizeAuthHeaders(headers: Headers) {
  const next = new Headers(headers);
  const host = firstForwardedValue(next.get("x-forwarded-host") || next.get("host"));
  const proto = firstForwardedValue(next.get("x-forwarded-proto")) || "https";
  if (host) {
    next.set("x-forwarded-host", host);
    next.set("host", host);
  }
  next.set("x-forwarded-proto", proto.replace(/:$/, ""));
  return next;
}

export function clearPinnedAuthUrl() {
  for (const name of ["AUTH_URL", "NEXTAUTH_URL", "AUTH_REDIRECT_PROXY_URL"] as const) {
    try {
      delete process.env[name];
    } catch {
      // Vercel/Edge may expose a non-configurable env object.
    }
    if (process.env[name]) process.env[name] = "";
  }
  process.env.AUTH_TRUST_HOST = "true";
}

/** Bind Auth.js to this request's host only. Do not pass a hardcoded production URL. */
export function bindAuthUrlToRequest(origin: string) {
  clearPinnedAuthUrl();
  const host = origin.replace(/\/$/, "");
  if (host) {
    process.env.AUTH_URL = host;
    process.env.NEXTAUTH_URL = host;
  }
  process.env.AUTH_TRUST_HOST = "true";
}

clearPinnedAuthUrl();
