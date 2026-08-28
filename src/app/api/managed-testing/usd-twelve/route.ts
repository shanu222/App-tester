import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { startUsdTwelveCheckout } from "@/lib/services/usd-twelve-package";

const testingType = z.enum(["INTERNAL", "CLOSED", "OPEN"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        appId: z.string().min(1),
        testingType,
        testingUrl: z.string().min(1),
      }),
    );
    const result = await startUsdTwelveCheckout(user.id, body);
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
