import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { grantTesterAccess } from "@/lib/services/invitations";

const schema = z.object({ testerCampaignId: z.string().min(1) });

/**
 * Give a confirmed tester access to the campaign's track.
 *
 * Open tracks complete immediately. Internal and closed tracks return 409 with
 * the exact Play Console steps, because Google's testers resource accepts
 * Google Groups only and cannot take an individual address.
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
