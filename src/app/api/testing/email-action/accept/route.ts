import { NextRequest, NextResponse } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { performMarketplaceEmailAction } from "@/lib/services/marketplace-campaigns";
import { env } from "@/lib/env";
import { isSafePlayRedirect } from "@/lib/testing/marketplace-rules";

export const runtime = "nodejs";

function tokenFrom(request: NextRequest) {
  const url = new URL(request.url);
  return (url.searchParams.get("t") || url.searchParams.get("token") || "").trim();
}

async function handle(request: NextRequest) {
  try {
    const token = tokenFrom(request);
    if (!token) throw new AppError("This invitation link is missing.", 400, "EMAIL_ACTION_INVALID");
    const result = await performMarketplaceEmailAction(token);
    const origin = env.appUrl.replace(/\/$/, "");
    if (result.playUrl && isSafePlayRedirect(result.playUrl)) {
      return NextResponse.redirect(result.playUrl, 302);
    }
    const next = new URL("/testing/email-action", origin);
    next.searchParams.set("ok", "1");
    next.searchParams.set("app", result.appName);
    return NextResponse.redirect(next, 302);
  } catch (error) {
    if (error instanceof AppError && (error.code === "EMAIL_ACTION_INVALID" || error.code === "EMAIL_ACTION_EXPIRED")) {
      const origin = env.appUrl.replace(/\/$/, "");
      const next = new URL("/testing/email-action", origin);
      next.searchParams.set("error", error.message);
      return NextResponse.redirect(next, 302);
    }
    return handleRouteError(error);
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export function OPTIONS() {
  return json({ ok: true });
}
