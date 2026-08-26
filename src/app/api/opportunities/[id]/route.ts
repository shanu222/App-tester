import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { generateOpportunityReply } from "@/lib/services/comments";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId: user.id },
      include: { source: true, post: true, commentDrafts: true, campaign: true },
    });
    if (!opportunity) throw new NotFoundError("Opportunity not found.");
    return json({ opportunity });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await parseJson(
      request,
      z.object({
        action: z.enum(["generate", "skip", "ignore"]),
        tone: z.string().optional(),
        campaignId: z.string().optional(),
        reason: z.string().optional(),
      }),
    );
    if (body.action === "generate") {
      const draft = await generateOpportunityReply({
        userId: user.id,
        opportunityId: id,
        tone: body.tone,
        campaignId: body.campaignId,
      });
      return json({ draft });
    }
    await prisma.opportunity.updateMany({
      where: { id, userId: user.id },
      data:
        body.action === "skip"
          ? { skipped: true }
          : { ignored: true, ignoreReason: body.reason || "Ignored" },
    });
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
