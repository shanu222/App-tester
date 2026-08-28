import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { getPublicTestingPage, joinPublicTest } from "@/lib/services/public-testing";
import { sanitizePublicJoinResult, sanitizePublicTestingPage } from "@/lib/public-copy";

const joinSchema = z.object({
  email: z.string().min(3).max(254),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const page = await getPublicTestingPage(slug);
    return json({ page: sanitizePublicTestingPage(page) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const body = await parseJson(request, joinSchema);
    const result = await joinPublicTest({ slug, email: body.email });
    return json({ result: sanitizePublicJoinResult(result) });
  } catch (error) {
    return handleRouteError(error);
  }
}
