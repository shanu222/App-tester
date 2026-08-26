import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const posts = await prisma.facebookPost.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "desc" },
      take: 100,
    });
    return json({ posts });
  } catch (error) {
    return handleRouteError(error);
  }
}
