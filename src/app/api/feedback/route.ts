import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { setTesterStatus } from "@/lib/services/testers";
import { logActivity, notify } from "@/lib/audit";

const schema = z.object({
  testerCampaignId: z.string(),
  overall: z.number().int().min(1).max(5).optional(),
  bugs: z.string().optional(),
  uiIssues: z.string().optional(),
  performance: z.string().optional(),
  suggestions: z.string().optional(),
  device: z.string().optional(),
  androidVersion: z.string().optional(),
  screenshotUrl: z.string().optional(),
  recordingUrl: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const feedback = await prisma.feedback.findMany({
      where: { userId: user.id },
      include: { tester: true, campaign: { include: { app: true } } },
      orderBy: { createdAt: "desc" },
    });
    return json({ feedback });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const row = await prisma.testerCampaign.findFirst({
      where: { id: body.testerCampaignId, userId: user.id },
      include: { campaign: true },
    });
    if (!row) return json({ error: "Tester campaign not found." }, 404);
    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        campaignId: row.campaignId,
        testerId: row.testerId,
        appId: row.campaign.appId,
        overall: body.overall,
        bugs: body.bugs,
        uiIssues: body.uiIssues,
        performance: body.performance,
        suggestions: body.suggestions,
        device: body.device,
        androidVersion: body.androidVersion,
        screenshotUrl: body.screenshotUrl,
        recordingUrl: body.recordingUrl,
      },
    });
    await setTesterStatus({
      userId: user.id,
      testerCampaignId: row.id,
      to: "FEEDBACK_RECEIVED",
      note: "Feedback stored",
    });
    await logActivity({
      userId: user.id,
      campaignId: row.campaignId,
      testerId: row.testerId,
      action: "FEEDBACK_RECEIVED",
    });
    await notify({
      userId: user.id,
      type: "feedback",
      title: "Feedback received",
      body: "A tester submitted feedback.",
      href: "/feedback",
      campaignId: row.campaignId,
    });
    return json({ feedback }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
