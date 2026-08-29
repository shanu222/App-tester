import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { ensurePaddleCheckoutTransaction } from "@/lib/paddle/checkout";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, z.object({ paymentPublicId: z.string().min(1) }));
    const result = await ensurePaddleCheckoutTransaction({
      userId: user.id,
      paymentPublicId: body.paymentPublicId,
    });
    return json({ ok: true, transactionId: result.transactionId });
  } catch (error) {
    return handleRouteError(error);
  }
}
