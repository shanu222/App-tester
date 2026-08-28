import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { getAssignmentScreenshot } from "@/lib/services/managed-testing";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const file = await getAssignmentScreenshot(user.id, publicId);
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
