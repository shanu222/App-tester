import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { verifyCron } from "@/lib/cron-auth";
import { sendDailySummaries } from "@/lib/services/notifications";
import { sendManagedTestingReports } from "@/lib/services/managed-testing";
import { notifyUsdTwelveLifecycle } from "@/lib/services/usd-twelve-package";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    verifyCron(request);
    const [result, managed] = await Promise.all([sendDailySummaries(), sendManagedTestingReports()]);
    const usdTwelve = await notifyUsdTwelveLifecycle();
    return json({ ok: true, result, managed, usdTwelve });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const POST = GET;
