import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import {
  confirmStubPayment,
  listDeveloperManagedCampaigns,
  listManagedPackages,
  startCheckout,
} from "@/lib/services/managed-testing";

export async function GET() {
  try {
    const user = await requireUser();
    const [packages, workspace] = await Promise.all([
      listManagedPackages(),
      listDeveloperManagedCampaigns(user.id),
    ]);
    return json({ packages, ...workspace });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        action: z.enum(["checkout", "confirm-stub"]),
        packageCode: z.string().optional(),
        paymentPublicId: z.string().optional(),
      }),
    );
    if (body.action === "checkout") {
      if (!body.packageCode) return json({ error: "Select a package." }, 400);
      const result = await startCheckout(user.id, body.packageCode);
      return json({ ok: true, ...result });
    }
    if (!body.paymentPublicId) return json({ error: "Payment required." }, 400);
    const result = await confirmStubPayment(user.id, body.paymentPublicId);
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
