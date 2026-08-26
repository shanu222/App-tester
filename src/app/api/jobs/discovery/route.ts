import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { enqueueJob, processDueJobs, scheduleRecurringJobs } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        type: z.enum(["discovery", "sync", "reply_sync", "health"]).default("discovery"),
        sourceId: z.string().optional(),
        campaignId: z.string().optional(),
      }),
    );
    if (body.type === "sync") {
      await scheduleRecurringJobs(user.id);
      const processed = await processDueJobs(5);
      return json({ processed });
    }
    const job = await enqueueJob({
      userId: user.id,
      type: body.type === "health" ? "integration_health" : body.type,
      payload: { sourceId: body.sourceId, campaignId: body.campaignId },
    });
    return json({ job });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return json({ jobs });
  } catch (error) {
    return handleRouteError(error);
  }
}
