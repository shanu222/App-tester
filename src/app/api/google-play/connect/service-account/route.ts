import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { connectServiceAccount } from "@/lib/services/play-connection";

const schema = z.object({
  serviceAccountJson: z.string().min(1, "Paste the service account JSON key."),
  packageName: z.string().trim().optional(),
});

/**
 * Verify and store a Play service-account key. The response carries only the
 * safe diagnostics object — never the key, and never a bearer token.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const diagnostics = await connectServiceAccount({
      userId: user.id,
      serviceAccountJson: body.serviceAccountJson,
      packageName: body.packageName,
    });
    return json(diagnostics, diagnostics.connected ? 200 : 409);
  } catch (error) {
    return handleRouteError(error);
  }
}
