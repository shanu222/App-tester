import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sha256, secureCompare } from "@/lib/crypto";
import { AppError, ForbiddenError } from "@/lib/errors";

export function verifyCron(request: NextRequest) {
  if (!env.cronSecret) {
    throw new AppError(
      "CRON_SECRET is not configured. Set it in Vercel → Project → Settings → Environment Variables to a cryptographically secure random value (for example: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\").",
      500,
      "CRON_SECRET_MISSING",
    );
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret") || "";
  if (!token || !secureCompare(token, env.cronSecret)) {
    throw new ForbiddenError("Invalid cron secret.");
  }
}

export function hashToken(token: string) {
  return sha256(token);
}
