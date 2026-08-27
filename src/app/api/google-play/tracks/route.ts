import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { listTracksForPackage } from "@/lib/services/play-connection";
import { testerAccessMode } from "@/lib/integrations/play-testers";

const schema = z.object({ packageName: z.string().trim().min(1, "Package name is required.") });

/**
 * Read the real tracks for a package and return the detected testing
 * configuration plus a TestLoop recommendation. Nothing is inferred.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const discovery = await listTracksForPackage({
      userId: user.id,
      packageName: body.packageName,
    });
    return json({
      packageName: discovery.packageName,
      tracks: discovery.tracks.map((track) => ({
        ...track,
        accessMode:
          track.typeGuess === "PRODUCTION"
            ? "MANUAL_EMAIL_LIST"
            : testerAccessMode(track.typeGuess),
      })),
      configuration: discovery.configuration,
      recommendation: discovery.recommendation,
      newTracks: discovery.newTracks,
      lastSyncAt: discovery.lastSyncAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
