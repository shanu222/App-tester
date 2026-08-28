import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import {
  exportCampaignReportCsv,
  getManagedCampaignForUser,
  listSelectableApps,
  saveCampaignReportPrefs,
  saveManagedCampaignSetup,
  sendManagedReminder,
  startManagedCampaign,
} from "@/lib/services/managed-testing";

const testingType = z.enum(["INTERNAL", "CLOSED", "OPEN"]);
const reportFrequency = z.enum(["DAILY", "WEEKLY", "COMPLETION"]);

export async function GET(request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const url = new URL(request.url);
    if (url.searchParams.get("export") === "csv") {
      const file = await exportCampaignReportCsv(user.id, publicId);
      return new Response(file.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${file.filename}"`,
        },
      });
    }
    const [campaign, apps] = await Promise.all([
      getManagedCampaignForUser(user.id, publicId),
      listSelectableApps(user.id),
    ]);
    return json({ campaign, apps });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const body = await parseJson(
      request,
      z.object({
        action: z.enum(["setup", "start", "reminder", "reports"]),
        appId: z.string().optional(),
        testingType: testingType.optional(),
        testingUrl: z.string().optional().nullable(),
        testingInstructions: z.string().optional().nullable(),
        assignmentPublicId: z.string().optional(),
        reportEmailEnabled: z.boolean().optional(),
        reportFrequency: reportFrequency.optional(),
        reportTime: z.string().optional(),
        reportTimezone: z.string().optional(),
        whatsappNumber: z.string().optional().nullable(),
      }),
    );
    if (body.action === "setup") {
      if (!body.appId || !body.testingType) return json({ error: "Select an app and testing type." }, 400);
      const result = await saveManagedCampaignSetup(user.id, publicId, {
        appId: body.appId,
        testingType: body.testingType,
        testingUrl: body.testingUrl,
        testingInstructions: body.testingInstructions,
      });
      return json({ ok: true, ...result });
    }
    if (body.action === "start") {
      const campaign = await startManagedCampaign(user.id, publicId);
      return json({ ok: true, campaign });
    }
    if (body.action === "reminder") {
      if (!body.assignmentPublicId) return json({ error: "Select a tester." }, 400);
      await sendManagedReminder(user.id, publicId, body.assignmentPublicId);
      return json({ ok: true });
    }
    const campaign = await saveCampaignReportPrefs(user.id, publicId, {
      reportEmailEnabled: body.reportEmailEnabled,
      reportFrequency: body.reportFrequency,
      reportTime: body.reportTime,
      reportTimezone: body.reportTimezone,
      whatsappNumber: body.whatsappNumber,
    });
    return json({ ok: true, campaign });
  } catch (error) {
    return handleRouteError(error);
  }
}
