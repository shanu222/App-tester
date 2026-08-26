import { json } from "@/lib/http";
import { googleOAuthConfigured, isDemoMode } from "@/lib/env";
import { googleLoginCallbackUrl } from "@/lib/canonical";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    service: "testloop",
    demoMode: isDemoMode(),
    time: new Date().toISOString(),
    googleOAuth: {
      configured: googleOAuthConfigured(),
      callbackUrl: googleLoginCallbackUrl(origin),
    },
  });
}
