import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  try {
    const user = await requireUser();
    const sources = await prisma.facebookSource.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return json({
      sources,
      groupLimitation: FACEBOOK_GROUP_LIMITATION,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        name: z.string().min(2),
        externalId: z.string().min(2),
        url: z.string().optional(),
      }),
    );
    const source = await prisma.facebookSource.upsert({
      where: { userId_externalId: { userId: user.id, externalId: body.externalId } },
      update: { name: body.name, url: body.url },
      create: {
        userId: user.id,
        type: "MANUAL_GROUP",
        externalId: body.externalId,
        name: body.name,
        url: body.url,
        canReadPosts: false,
        canComment: false,
        canMonitorReplies: false,
        limitationNote: FACEBOOK_GROUP_LIMITATION,
        isDemo: isDemoMode(),
      },
    });
    return json({ source }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
