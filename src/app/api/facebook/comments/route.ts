import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { approveAndPost } from "@/lib/services/comments";
import { prisma } from "@/lib/db";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        draftId: z.string(),
        body: z.string().optional(),
        cancel: z.boolean().optional(),
      }),
    );
    if (body.cancel) {
      await prisma.commentDraft.updateMany({
        where: { id: body.draftId, userId: user.id },
        data: { status: "CANCELLED" },
      });
      return json({ ok: true });
    }
    const result = await approveAndPost({
      userId: user.id,
      draftId: body.draftId,
      body: body.body,
    });
    return json({
      comment: result,
      groupLimitation:
        result.mode === "manual" ? FACEBOOK_GROUP_LIMITATION : null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
