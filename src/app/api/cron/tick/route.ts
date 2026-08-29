import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { processDueJobs, scheduleRecurringJobs } from "@/lib/jobs/queue";
import { processMarketplaceNotificationJobs } from "@/lib/services/marketplace-campaigns";

export async function GET(request: NextRequest) {
  try {
    verifyCron(request);
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    for (const user of users) {
      await scheduleRecurringJobs(user.id);
    }
    const processed = await processDueJobs(10);
    const marketplace = await processMarketplaceNotificationJobs();
    return json({ ok: true, processed, marketplace });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const POST = GET;
