import { json, handleRouteError } from "@/lib/http";
import { requireAdmin } from "@/auth";
import { adminGetPayment } from "@/lib/services/managed-testing";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    await requireAdmin();
    const { publicId } = await context.params;
    return json(await adminGetPayment(publicId));
  } catch (error) {
    return handleRouteError(error);
  }
}
