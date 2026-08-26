import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
    const minScore = Number(request.nextUrl.searchParams.get("minScore") || 0);
    const opportunities = await prisma.opportunity.findMany({
      where: {
        userId: user.id,
        skipped: false,
        ignored: false,
        campaignId,
        relevanceScore: { gte: minScore },
      },
      include: {
        source: true,
        post: true,
        commentDrafts: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: { relevanceScore: "desc" },
      take: 100,
    });
    return json({ opportunities });
  } catch (error) {
    return handleRouteError(error);
  }
}
