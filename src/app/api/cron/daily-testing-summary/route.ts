import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { verifyCron } from "@/lib/cron-auth";
import { sendDailySummaries } from "@/lib/services/notifications";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    verifyCron(request);
    const result = await sendDailySummaries();
    return json({ ok: true, result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const POST = GET;
