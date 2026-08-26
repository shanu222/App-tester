import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { discoverOpportunities, importManualPost } from "@/lib/services/discovery";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        sourceId: z.string(),
        campaignId: z.string().optional(),
        range: z.enum(["1d", "3d", "7d"]).optional(),
        keywords: z.array(z.string()).optional(),
        message: z.string().optional(),
        personName: z.string().optional(),
        postLink: z.string().optional(),
      }),
    );
    if (body.message) {
      const result = await importManualPost({
        userId: user.id,
        sourceId: body.sourceId,
        campaignId: body.campaignId,
        message: body.message,
        personName: body.personName,
        postLink: body.postLink,
      });
      return json(result);
    }
    const result = await discoverOpportunities({
      userId: user.id,
      sourceId: body.sourceId,
      campaignId: body.campaignId,
      range: body.range,
      keywords: body.keywords,
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
