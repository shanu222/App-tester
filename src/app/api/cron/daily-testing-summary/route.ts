import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { verifyCron } from "@/lib/cron-auth";
import { sendDailySummaries } from "@/lib/services/notifications";
import { sendManagedTestingReports } from "@/lib/services/managed-testing";
import { notifyUsdTwelveLifecycle } from "@/lib/services/usd-twelve-package";
import { processMarketplaceNotificationJobs } from "@/lib/services/marketplace-campaigns";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    verifyCron(request);
    const [result, managed] = await Promise.all([sendDailySummaries(), sendManagedTestingReports()]);
    const usdTwelve = await notifyUsdTwelveLifecycle();
    const marketplace = await processMarketplaceNotificationJobs();
    return json({ ok: true, result, managed, usdTwelve, marketplace });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const POST = GET;
