import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { syncPaddleTransactionFromApi } from "@/lib/paddle/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        paymentPublicId: z.string().min(1),
        transactionId: z.string().min(1),
      }),
    );
    const result = await syncPaddleTransactionFromApi({
      userId: user.id,
      paymentPublicId: body.paymentPublicId,
      transactionId: body.transactionId,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
