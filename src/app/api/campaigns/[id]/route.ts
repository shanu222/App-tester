import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { campaignStats, getCampaign } from "@/lib/services/campaigns";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const campaign = await getCampaign(user.id, id);
    const stats = await campaignStats(user.id, id);
    return json({ campaign, stats });
  } catch (error) {
    return handleRouteError(error);
  }
}
