import { handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { getPaymentProof } from "@/lib/services/managed-testing";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const file = await getPaymentProof({ publicId, userId: user.id, admin: user.role === "ADMIN" });
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
