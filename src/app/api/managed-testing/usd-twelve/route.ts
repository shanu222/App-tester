import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { USD_TWELVE_PAYMENT_CHOICES } from "@/lib/managed-testing/methods";
import { startUsdTwelveCheckout } from "@/lib/services/usd-twelve-package";

export const runtime = "nodejs";
export const maxDuration = 60;

const testingType = z.enum(["INTERNAL", "CLOSED", "OPEN"]);
const paymentMethod = z.enum(USD_TWELVE_PAYMENT_CHOICES);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        appId: z.string().min(1),
        testingType,
        testingUrl: z.string().min(1),
        paymentMethod,
      }),
    );
    const result = await startUsdTwelveCheckout(user.id, body);
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
