import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { confirmTesterAdded } from "@/lib/services/invitations";

const schema = z.object({ testerCampaignId: z.string().min(1) });

/**
 * Record that the developer added the address to a Play Console email list.
 * Google exposes no way to read an email list back, so only the developer can
 * assert this and TestLoop stores it as their attestation.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    await confirmTesterAdded(user.id, body.testerCampaignId);
    return json({ confirmed: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
