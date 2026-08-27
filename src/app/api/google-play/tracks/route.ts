import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { listTracksForPackage } from "@/lib/services/play-connection";
import { testerAccessMode } from "@/lib/integrations/play-testers";

const schema = z.object({ packageName: z.string().trim().min(1, "Package name is required.") });

const TESTING_TYPE = {
  INTERNAL: "INTERNAL",
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  PRODUCTION: "OPEN",
} as const;

/**
 * Read the real tracks for a package. Each track is annotated with whether
 * TestLoop can register testers for it automatically, which depends entirely on
 * what the Play API supports rather than on any TestLoop setting.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const tracks = await listTracksForPackage({
      userId: user.id,
      packageName: body.packageName,
    });
    return json({
      packageName: body.packageName,
      tracks: tracks.map((track) => ({
        ...track,
        accessMode: testerAccessMode(TESTING_TYPE[track.typeGuess]),
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
