import { json, handleRouteError } from "@/lib/http";
import { confirmManagedParticipation, loadJoinPage } from "@/lib/services/managed-testing";
import { findUsdTwelveAssignmentByToken, notifyUsdTwelveAfterConfirmation } from "@/lib/services/usd-twelve-package";
import { isUsdTwelvePackage } from "@/lib/managed-testing/usd-twelve";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const page = await loadJoinPage(token);
    return json({ page });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let token = "";
    let screenshot: { mime: string; bytes: Buffer } | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      token = String(form.get("token") || "");
      const file = form.get("screenshot");
      if (file && typeof file !== "string" && file.size > 0) {
        screenshot = { mime: file.type || "image/jpeg", bytes: Buffer.from(await file.arrayBuffer()) };
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as { token?: string };
      token = body.token || "";
    }
    const assignment = await findUsdTwelveAssignmentByToken(token);
    const result = await confirmManagedParticipation(token, screenshot);
    if (assignment && isUsdTwelvePackage(assignment.campaign.payment.package.code)) {
      await notifyUsdTwelveAfterConfirmation(assignment.publicId, Boolean(screenshot));
    }
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
