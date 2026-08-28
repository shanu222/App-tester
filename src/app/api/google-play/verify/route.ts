import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { verifyPlayConnection } from "@/lib/services/play-connection";

export const maxDuration = 60;

const schema = z.object({ packageName: z.string().trim().optional() });

/** Re-run the read-only Play checks against the stored credentials. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const diagnostics = await verifyPlayConnection({
      userId: user.id,
      packageName: body.packageName,
    });
    return json(diagnostics, diagnostics.connected ? 200 : 409);
  } catch (error) {
    return handleRouteError(error);
  }
}
