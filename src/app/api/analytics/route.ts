import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { getFunnel } from "@/lib/services/dashboard";
import { campaignStats } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
    const funnel = await getFunnel(user.id, campaignId);
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, targetTesters: true, requiredTesters: true, requiredActiveDays: true },
    });
    const perCampaign = [];
    for (const campaign of campaigns) {
      const stats = await campaignStats(user.id, campaign.id);
      perCampaign.push({ ...campaign, stats });
    }
    return json({ funnel, campaigns: perCampaign });
  } catch (error) {
    return handleRouteError(error);
  }
}
