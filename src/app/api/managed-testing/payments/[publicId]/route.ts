import { handleRouteError, json } from "@/lib/http";
import { requireUser } from "@/auth";
import { getPaymentCheckoutForUser, submitPaymentProof } from "@/lib/services/managed-testing";

export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const view = await getPaymentCheckoutForUser(user.id, publicId);
    return json({
      ok: true,
      status: view.payment.status,
      active: view.activated,
      campaignPublicId: view.campaignPublicId,
      paddleCheckout: view.payment.paddleCheckout,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const form = await request.formData();
    const methodId = String(form.get("methodId") || "");
    const developerReference = String(form.get("developerReference") || "").trim();
    const file = form.get("proof");
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Upload a payment screenshot or PDF." }, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const payment = await submitPaymentProof({
      userId: user.id,
      publicId,
      methodId,
      developerReference: developerReference || null,
      file: { type: file.type, size: file.size, name: file.name, bytes },
    });
    return json({ ok: true, payment });
  } catch (error) {
    return handleRouteError(error);
  }
}
