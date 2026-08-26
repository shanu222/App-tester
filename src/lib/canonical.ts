export const CANONICAL_HOST = "www.testloop.org";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/** Hostnames that should 308 to the canonical production domain. */
export const PRODUCTION_ALIAS_HOSTS = ["testloop.org", "app-tester-three.vercel.app"] as const;

export function isVercelProduction() {
  return process.env.VERCEL_ENV === "production";
}

export function googleLoginCallbackUrl(origin = CANONICAL_ORIGIN) {
  return `${origin.replace(/\/$/, "")}/api/auth/callback/google`;
}
