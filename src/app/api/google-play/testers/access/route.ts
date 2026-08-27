import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { grantTesterAccess } from "@/lib/services/invitations";

const schema = z.object({ testerCampaignId: z.string().min(1) });

/**
 * Give a confirmed tester access to the campaign's track.
 *
 * Open tracks complete immediately. Internal and closed tracks return 409
 * because the Play testers resource cannot take an individual Gmail address.
 * That is a Google Play limitation, not a TestLoop error.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const result = await grantTesterAccess({
      userId: user.id,
      testerCampaignId: body.testerCampaignId,
    });
    return json(result, result.ok ? 200 : 409);
  } catch (error) {
    return handleRouteError(error);
  }
}
