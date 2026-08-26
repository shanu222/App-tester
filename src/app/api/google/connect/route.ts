import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { upsertIntegration } from "@/lib/integrations/store";
import { testPlayAccess } from "@/lib/integrations/play";
import type { ServiceAccountJson } from "@/lib/integrations/play";
import { AppError } from "@/lib/errors";

const schema = z.object({
  serviceAccountJson: z.string().min(20),
  packageName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    let parsed: ServiceAccountJson;
    try {
      parsed = JSON.parse(body.serviceAccountJson) as ServiceAccountJson;
    } catch {
      throw new AppError("Service account JSON is invalid.");
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new AppError("Service account JSON must include client_email and private_key.");
    }
    await upsertIntegration({
      userId: user.id,
      provider: "GOOGLE_PLAY",
      status: "CONNECTING",
      displayName: parsed.client_email,
      credentials: { serviceAccountJson: JSON.stringify(parsed) },
    });
    const result = await testPlayAccess(parsed, body.packageName);
    await upsertIntegration({
      userId: user.id,
      provider: "GOOGLE_PLAY",
      status: result.ok ? "CONNECTED" : "ERROR",
      displayName: parsed.client_email,
      credentials: { serviceAccountJson: JSON.stringify(parsed) },
      lastError: result.ok ? null : result.error,
      capabilities: {
        "play.apps.search": result.ok,
        "play.tracks.read": result.ok,
        "play.testers.googleGroups": result.ok,
        "play.testers.emailList": false,
        "play.install.perTester": false,
      },
    });
    if (!result.ok) {
      return json({ connected: false, error: result.error, manualFallback: result.manualFallback }, 409);
    }
    return json({ connected: true, detail: result.data.detail });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
    return json({
      integrations: integrations.map((item) => ({
        ...item,
        encryptedCredentials: undefined,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
