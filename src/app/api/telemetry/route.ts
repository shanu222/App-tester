import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { setTesterStatus } from "@/lib/services/testers";
import { logActivity } from "@/lib/audit";

const schema = z.object({
  campaignToken: z.string(),
  anonymousId: z.string().min(4),
  appVersion: z.string().optional(),
  platform: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, schema);
    const campaign = await prisma.campaign.findUnique({
      where: { telemetryToken: body.campaignToken },
    });
    if (!campaign) return json({ error: "Unknown campaign token." }, 404);
    const now = new Date();
    const event = await prisma.telemetryEvent.upsert({
      where: {
        campaignId_anonymousId: {
          campaignId: campaign.id,
          anonymousId: body.anonymousId,
        },
      },
      update: {
        lastActiveAt: now,
        appVersion: body.appVersion,
        platform: body.platform,
      },
      create: {
        userId: campaign.userId,
        campaignId: campaign.id,
        appId: campaign.appId,
        anonymousId: body.anonymousId,
        appVersion: body.appVersion,
        platform: body.platform,
        firstLaunchAt: now,
        lastActiveAt: now,
      },
    });
    const row = await prisma.testerCampaign.findFirst({
      where: { campaignId: campaign.id, status: { in: ["OPTED_IN", "INSTALL_STATUS_UNKNOWN", "TESTING"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (row && row.status === "OPTED_IN") {
      await setTesterStatus({
        userId: campaign.userId,
        testerCampaignId: row.id,
        to: "INSTALL_STATUS_UNKNOWN",
        note: "Telemetry received. This is tester activity detected, not a Google Play per-Gmail download confirmation.",
      });
      await setTesterStatus({
        userId: campaign.userId,
        testerCampaignId: row.id,
        to: "TESTING",
        note: "Testing activity detected from in-app telemetry.",
      });
    }
    await logActivity({
      userId: campaign.userId,
      campaignId: campaign.id,
      action: "TEST_ACTIVITY_RECORDED",
      result: body.anonymousId,
    });
    return json({
      ok: true,
      firstLaunchAt: event.firstLaunchAt,
      lastActiveAt: event.lastActiveAt,
      disclaimer: "Tester activity detected — not a Google Play per-account download confirmation.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
