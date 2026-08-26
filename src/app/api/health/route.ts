import { json } from "@/lib/http";
import { env, googleOAuthConfigured, isDemoMode } from "@/lib/env";
import { googleLoginCallbackUrl } from "@/lib/canonical";

export async function GET() {
  return json({
    ok: true,
    service: "testloop",
    demoMode: isDemoMode(),
    time: new Date().toISOString(),
    googleOAuth: {
      configured: googleOAuthConfigured(),
      callbackUrl: googleLoginCallbackUrl(env.appUrl),
    },
  });
}
