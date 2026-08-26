import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const [developers, apps, campaigns, participations, reports, jobs] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.app.count(),
      prisma.campaign.count(),
      prisma.testingParticipation.count(),
      prisma.developerReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { id: true, name: true, developerName: true } } },
      }),
      prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, status: true, lastError: true, createdAt: true },
      }),
    ]);
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        developerName: true,
        email: true,
        role: true,
        profileCompleted: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { apps: true, campaigns: true } },
      },
    });
    const playHealth = await prisma.integration.groupBy({
      by: ["status"],
      where: { provider: "GOOGLE_PLAY" },
      _count: true,
    });
    return json({
      stats: { developers, apps, campaigns, participations },
      users,
      reports,
      jobs,
      playHealth,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await parseJson(
      request,
      z.object({
        userId: z.string(),
        action: z.enum(["suspend", "restore"]),
      }),
    );
    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { suspendedAt: body.action === "suspend" ? new Date() : null },
      select: { id: true, suspendedAt: true },
    });
    return json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
