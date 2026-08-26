import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decryptJson } from "@/lib/encryption";
import { exchangeGmailCode } from "@/lib/integrations/gmail";
import { upsertIntegration } from "@/lib/integrations/store";
import { env } from "@/lib/env";
import { google } from "googleapis";
import { gmailOAuthClient } from "@/lib/integrations/gmail";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const origin = env.appUrl;
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/integrations?gmail=denied`);
  }
  const jar = await cookies();
  const stored = jar.get("gmail_oauth_state")?.value;
  if (!stored || stored !== state) {
    return NextResponse.redirect(`${origin}/integrations?gmail=state`);
  }
  try {
    const parsed = decryptJson<{ userId: string; exp: number }>(state);
    if (parsed.exp < Date.now()) {
      return NextResponse.redirect(`${origin}/integrations?gmail=expired`);
    }
    const tokens = await exchangeGmailCode(code);
    const client = gmailOAuthClient();
    client.setCredentials(tokens);
    const oauth = google.oauth2({ version: "v2", auth: client });
    const me = await oauth.userinfo.get();
    await upsertIntegration({
      userId: parsed.userId,
      provider: "GMAIL",
      status: "CONNECTED",
      displayName: me.data.email || "Gmail",
      credentials: {
        refreshToken: tokens.refresh_token || undefined,
        accessToken: tokens.access_token || undefined,
        email: me.data.email || undefined,
      },
      scopes: ["gmail.send"],
      capabilities: { "gmail.send": true },
      externalAccountId: me.data.email || undefined,
    });
    await upsertIntegration({
      userId: parsed.userId,
      provider: "GOOGLE",
      status: "CONNECTED",
      displayName: me.data.email || "Google",
      credentials: { email: me.data.email || undefined },
      externalAccountId: me.data.email || undefined,
    });
    jar.delete("gmail_oauth_state");
    return NextResponse.redirect(`${origin}/integrations?gmail=connected`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${origin}/integrations?gmail=error`);
  }
}
