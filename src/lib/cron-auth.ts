import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sha256, secureCompare } from "@/lib/crypto";
import { ForbiddenError } from "@/lib/errors";

export function verifyCron(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret") || "";
  if (!env.cronSecret || !token || !secureCompare(token, env.cronSecret)) {
    throw new ForbiddenError("Invalid cron secret.");
  }
}

export function hashToken(token: string) {
  return sha256(token);
}
