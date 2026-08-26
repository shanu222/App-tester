import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const logs = await prisma.activityLog.findMany({
      where: { userId: user.id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return json({ logs });
  } catch (error) {
    return handleRouteError(error);
  }
}
