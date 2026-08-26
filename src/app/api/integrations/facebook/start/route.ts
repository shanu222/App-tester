import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { facebookConfigured, facebookOAuthUrl } from "@/lib/integrations/facebook";
import { encryptJson } from "@/lib/encryption";
import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    if (!facebookConfigured()) {
      throw new AppError(
        "Facebook OAuth is not configured. Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET.",
      );
    }
    const state = encryptJson({ userId: user.id, exp: Date.now() + 10 * 60 * 1000 });
    const jar = await cookies();
    jar.set("fb_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    redirect(facebookOAuthUrl(state));
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    return handleRouteError(error);
  }
}
