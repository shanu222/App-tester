import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { createOrGetTester } from "@/lib/services/testers";

const schema = z.object({
  campaignId: z.string(),
  email: z.string().min(3),
  name: z.string().optional(),
  sourceLabel: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const result = await createOrGetTester({
      userId: user.id,
      campaignId: body.campaignId,
      email: body.email,
      name: body.name,
      sourceLabel: body.sourceLabel || "Manual",
      failIfDuplicate: true,
    });
    return json(result, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
