import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { readCredentials } from "@/lib/integrations/store";
import { listPlayTracks } from "@/lib/integrations/play";
import type { ServiceAccountJson } from "@/lib/integrations/play";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { packageName } = await parseJson(
      request,
      z.object({ packageName: z.string().min(3) }),
    );
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: user.id, provider: "GOOGLE_PLAY" } },
    });
    const creds = readCredentials(integration?.encryptedCredentials);
    if (!creds?.serviceAccountJson) {
      throw new AppError("Google Play is not connected.");
    }
    const result = await listPlayTracks(
      JSON.parse(creds.serviceAccountJson) as ServiceAccountJson,
      packageName,
    );
    if (!result.ok) return json({ error: result.error, tracks: [], manualFallback: result.manualFallback }, 409);
    return json({ tracks: result.data });
  } catch (error) {
    return handleRouteError(error);
  }
}
