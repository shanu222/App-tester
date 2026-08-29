import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { removeAllOwnActivityLogs } from "@/lib/audit";

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

export async function DELETE() {
  try {
    const user = await requireUser();
    const result = await removeAllOwnActivityLogs(user.id);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
