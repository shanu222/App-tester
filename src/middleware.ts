import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { CANONICAL_HOST, CANONICAL_ORIGIN, PRODUCTION_ALIAS_HOSTS, isVercelProduction } from "@/lib/canonical";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
  "/about",
  "/sitemap.xml",
  "/robots.txt",
  "/api/auth",
  "/api/health",
  "/api/cron",
  "/api/telemetry",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
}

function canonicalHostRedirect(req: NextRequest) {
  if (!isVercelProduction()) return null;
  const host = req.nextUrl.hostname.toLowerCase();
  if (!PRODUCTION_ALIAS_HOSTS.includes(host as (typeof PRODUCTION_ALIAS_HOSTS)[number])) return null;
  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export default auth((req) => {
  const canonical = canonicalHostRedirect(req);
  if (canonical) return canonical;
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (!req.auth?.user?.id) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const login = new URL("/", CANONICAL_ORIGIN);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)"],
};
