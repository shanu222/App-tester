import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (!req.auth?.user?.id) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const login = new URL("/", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)"],
};
