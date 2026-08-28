import { NextRequest, NextResponse } from "next/server";
import { verifyNotificationEmailToken } from "@/lib/services/notifications";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const dest = new URL("/settings", env.appUrl);
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    if (!token) {
      dest.searchParams.set("email", "invalid");
      return NextResponse.redirect(dest);
    }
    await verifyNotificationEmailToken(token);
    dest.searchParams.set("email", "verified");
    return NextResponse.redirect(dest);
  } catch (error) {
    dest.searchParams.set("email", error instanceof AppError ? "invalid" : "invalid");
    return NextResponse.redirect(dest);
  }
}
