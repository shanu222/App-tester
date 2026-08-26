import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { addTesterToGroup, confirmManualMembership } from "@/lib/services/invitations";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        testerCampaignId: z.string(),
        confirmManual: z.boolean().optional(),
      }),
    );
    if (body.confirmManual) {
      const result = await confirmManualMembership(user.id, body.testerCampaignId);
      return json({ ok: true, testerCampaign: result });
    }
    const result = await addTesterToGroup({
      userId: user.id,
      testerCampaignId: body.testerCampaignId,
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
