import { handleRouteError } from "@/lib/http";
import { requireAdmin } from "@/auth";
import { getPaymentProof } from "@/lib/services/managed-testing";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { publicId } = await context.params;
    const file = await getPaymentProof({ publicId, userId: admin.id, admin: true });
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
