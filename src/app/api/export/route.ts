import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const user = await requireUser();
    const [testers, campaigns, apps, opportunities] = await Promise.all([
      prisma.tester.findMany({
        where: { userId: user.id },
        include: { campaigns: true },
      }),
      prisma.campaign.findMany({ where: { userId: user.id } }),
      prisma.app.findMany({ where: { userId: user.id } }),
      prisma.opportunity.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          personName: true,
          relevanceScore: true,
          postContent: true,
          createdAt: true,
        },
      }),
    ]);
    const payload = { exportedAt: new Date().toISOString(), testers, campaigns, apps, opportunities };
    await prisma.dataExport.create({ data: { userId: user.id, payload } });
    return json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
