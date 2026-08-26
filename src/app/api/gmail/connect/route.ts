import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { gmailAuthUrl } from "@/lib/integrations/gmail";
import { googleOAuthConfigured } from "@/lib/env";
import { encryptJson } from "@/lib/encryption";
import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    if (!googleOAuthConfigured()) {
      throw new AppError("Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }
    const state = encryptJson({ userId: user.id, exp: Date.now() + 10 * 60 * 1000 });
    const jar = await cookies();
    jar.set("gmail_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    redirect(gmailAuthUrl(state));
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    return handleRouteError(error);
  }
}
