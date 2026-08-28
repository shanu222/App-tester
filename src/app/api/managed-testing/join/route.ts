import { json, handleRouteError } from "@/lib/http";
import { confirmManagedParticipation, loadJoinPage } from "@/lib/services/managed-testing";

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
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const token = String(form.get("token") || "");
      const file = form.get("screenshot");
      let screenshot: { mime: string; bytes: Buffer } | null = null;
      if (file && typeof file !== "string" && file.size > 0) {
        screenshot = { mime: file.type || "image/jpeg", bytes: Buffer.from(await file.arrayBuffer()) };
      }
      const result = await confirmManagedParticipation(token, screenshot);
      return json(result);
    }
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const result = await confirmManagedParticipation(body.token || "", null);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
