import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { encryptJson } from "@/lib/encryption";
import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";
import {
  PLAY_OAUTH_STATE_COOKIE,
  playOAuthAuthorizationUrl,
  playOAuthConfigured,
} from "@/lib/integrations/play-auth";

/**
 * Begin the Play Console authorisation flow. This is a per-developer API
 * authorisation and is entirely separate from TestLoop sign-in, which is
 * handled by Firebase.
 */
export async function GET() {
  try {
    const user = await requireUser();
    if (!playOAuthConfigured()) {
      throw new AppError(
        "Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or connect with a service account instead.",
      );
    }
    // The state is encrypted server-side and echoed by Google, so the callback
    // can prove which signed-in developer started the flow.
    const state = encryptJson({ userId: user.id, exp: Date.now() + 10 * 60 * 1000 });
    const jar = await cookies();
    jar.set(PLAY_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    redirect(playOAuthAuthorizationUrl(state));
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    return handleRouteError(error);
  }
}
