import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { AppError } from "@/lib/errors";
import { connectServiceAccount } from "@/lib/services/play-connection";
import { publicPlayDiagnostics } from "@/lib/integrations/play-diagnostics";

const jsonSchema = z.object({
  serviceAccountJson: z.string().min(1, "Upload the service account JSON key file."),
  packageName: z.string().trim().optional(),
});

const MAX_KEY_BYTES = 64_000;

async function readUploadedKey(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("keyFile");
    if (!(file instanceof File) || file.size < 1) {
      throw new AppError("Upload the service account JSON key file.");
    }
    if (file.size > MAX_KEY_BYTES) {
      throw new AppError("That file is too large to be a service account key.");
    }
    const serviceAccountJson = await file.text();
    const packageName = String(form.get("packageName") || "").trim() || undefined;
    return { serviceAccountJson, packageName };
  }
  const body = await parseJson(request, jsonSchema);
  return { serviceAccountJson: body.serviceAccountJson, packageName: body.packageName };
}

/**
 * Verify and store a Play service-account key. The response carries only the
 * public diagnostics object — never the key, client_email, project_id, or a token.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readUploadedKey(request);
    const diagnostics = await connectServiceAccount({
      userId: user.id,
      serviceAccountJson: body.serviceAccountJson,
      packageName: body.packageName,
    });
    return json(publicPlayDiagnostics(diagnostics), diagnostics.connected ? 200 : 409);
  } catch (error) {
    return handleRouteError(error);
  }
}
