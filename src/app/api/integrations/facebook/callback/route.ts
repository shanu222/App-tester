import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptJson, encryptSecret } from "@/lib/encryption";
import { exchangeFacebookCode, fetchFacebookPages } from "@/lib/integrations/facebook";
import { upsertIntegration } from "@/lib/integrations/store";
import { facebookPageCapabilities } from "@/lib/integrations/capabilities";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const origin = env.appUrl;
  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/integrations?facebook=denied`);
  }
  const jar = await cookies();
  const stored = jar.get("fb_oauth_state")?.value;
  if (!stored || stored !== state) {
    return NextResponse.redirect(`${origin}/integrations?facebook=state`);
  }
  try {
    const parsed = decryptJson<{ userId: string; exp: number }>(state);
    if (parsed.exp < Date.now()) {
      return NextResponse.redirect(`${origin}/integrations?facebook=expired`);
    }
    const token = await exchangeFacebookCode(code);
    const pages = await fetchFacebookPages(token);
    await upsertIntegration({
      userId: parsed.userId,
      provider: "FACEBOOK",
      status: "CONNECTED",
      displayName: `${pages.length} Page(s)`,
      credentials: { userToken: token },
      scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_engagement"],
      capabilities: facebookPageCapabilities(),
    });
    for (const page of pages) {
      await prisma.facebookSource.upsert({
        where: { userId_externalId: { userId: parsed.userId, externalId: page.id } },
        update: {
          name: page.name,
          type: "PAGE",
          canReadPosts: true,
          canComment: page.canComment,
          canMonitorReplies: true,
          encryptedPageToken: encryptSecret(page.access_token),
          limitationNote: null,
        },
        create: {
          userId: parsed.userId,
          type: "PAGE",
          externalId: page.id,
          name: page.name,
          canReadPosts: true,
          canComment: page.canComment,
          canMonitorReplies: true,
          encryptedPageToken: encryptSecret(page.access_token),
        },
      });
    }
    jar.delete("fb_oauth_state");
    return NextResponse.redirect(`${origin}/integrations?facebook=connected`);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${origin}/integrations?facebook=error`);
  }
}
