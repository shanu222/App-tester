import { CANONICAL_ORIGIN, isVercelProduction } from "@/lib/canonical";

/**
 * Auth.js v5 builds Google's redirect_uri from AUTH_URL when set.
 * Pin it on Vercel production so login never inherits the request hostname
 * (www vs apex vs *.vercel.app), which is what caused redirect_uri_mismatch.
 */
if (isVercelProduction()) {
  process.env.AUTH_URL = CANONICAL_ORIGIN;
  process.env.NEXTAUTH_URL = CANONICAL_ORIGIN;
}
