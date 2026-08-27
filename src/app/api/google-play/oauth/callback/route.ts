import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decryptJson } from "@/lib/encryption";
import { env } from "@/lib/env";
import { connectOAuthCode } from "@/lib/services/play-connection";
import { PLAY_OAUTH_STATE_COOKIE } from "@/lib/integrations/play-auth";

/**
 * Google redirects here after the developer authorises Play access. The
 * authorisation code is exchanged server-side and the resulting refresh token
 * is encrypted before storage; neither ever reaches the browser.
 *
 * Outcomes are passed back as a short status code in the URL rather than a
 * message, so nothing sensitive can end up in browser history or a referer.
 */
export async function GET(request: NextRequest) {
  const origin = env.appUrl.replace(/\/$/, "");
  const target = (status: string) => `${origin}/play?play=${status}`;

  const oauthError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (oauthError === "access_denied") return NextResponse.redirect(target("denied"));
  if (oauthError || !code || !state) return NextResponse.redirect(target("invalid"));

  const jar = await cookies();
  const stored = jar.get(PLAY_OAUTH_STATE_COOKIE)?.value;
  if (!stored || stored !== state) {
    return NextResponse.redirect(target("state"));
  }

  try {
    const parsed = decryptJson<{ userId: string; exp: number }>(state);
    if (parsed.exp < Date.now()) {
      return NextResponse.redirect(target("expired"));
    }
    const diagnostics = await connectOAuthCode({ userId: parsed.userId, code });
    jar.delete(PLAY_OAUTH_STATE_COOKIE);
    // A failed verification is still stored as an ERROR connection, so the page
    // can show Google's own reason instead of a generic failure.
    return NextResponse.redirect(target(diagnostics.connected ? "connected" : "unverified"));
  } catch (error) {
    console.error("Google Play OAuth callback failed", error);
    jar.delete(PLAY_OAUTH_STATE_COOKIE);
    return NextResponse.redirect(target("error"));
  }
}
