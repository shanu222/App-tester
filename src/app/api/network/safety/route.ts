import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { blockDeveloper, reportDeveloper, sendDeveloperMessage, publicDeveloper } from "@/lib/services/network";

export async function GET() {
  try {
    const user = await requireUser();
    const messages = await prisma.developerMessage.findMany({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    return json({
      messages: messages.map((item) => ({
        id: item.id,
        body: item.body,
        createdAt: item.createdAt,
        mine: item.senderId === user.id,
        sender: publicDeveloper(item.sender),
        recipient: publicDeveloper(item.recipient),
      })),
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
        action: z.enum(["message", "report", "block"]),
        recipientId: z.string().optional(),
        targetId: z.string().optional(),
        campaignId: z.string().optional(),
        text: z.string().min(1).max(2000).optional(),
        reason: z.string().max(200).optional(),
        details: z.string().max(2000).optional(),
      }),
    );
    if (body.action === "message") {
      if (!body.recipientId || !body.text) return json({ error: "recipientId and text required." }, 400);
      const message = await sendDeveloperMessage(user.id, body.recipientId, body.text);
      return json({ message });
    }
    if (body.action === "report") {
      const report = await reportDeveloper(user.id, {
        targetId: body.targetId,
        campaignId: body.campaignId,
        reason: body.reason || "abuse",
        details: body.details,
      });
      return json({ report });
    }
    if (body.action === "block") {
      if (!body.targetId) return json({ error: "targetId required." }, 400);
      const block = await blockDeveloper(user.id, body.targetId, body.reason);
      return json({ block });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
