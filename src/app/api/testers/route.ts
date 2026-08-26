import { NextRequest } from "next/server";
import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = request.nextUrl;
    const campaignId = searchParams.get("campaignId") || undefined;
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const testers = await prisma.tester.findMany({
      where: {
        userId: user.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { emailNormalized: { contains: q.toLowerCase() } },
              ],
            }
          : {}),
        campaigns: campaignId || status
          ? {
              some: {
                ...(campaignId ? { campaignId } : {}),
                ...(status ? { status: status as never } : {}),
              },
            }
          : undefined,
      },
      include: {
        campaigns: { include: { campaign: { include: { app: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return json({ testers });
  } catch (error) {
    return handleRouteError(error);
  }
}
