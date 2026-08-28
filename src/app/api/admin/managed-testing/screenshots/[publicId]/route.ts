import { handleRouteError } from "@/lib/http";
import { requireAdmin } from "@/auth";
import { adminGetUsdTwelveScreenshot } from "@/lib/services/usd-twelve-package";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    await requireAdmin();
    const { publicId } = await context.params;
    const file = await adminGetUsdTwelveScreenshot(publicId);
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
