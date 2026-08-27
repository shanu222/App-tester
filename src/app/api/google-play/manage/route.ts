import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { managePlayTrack } from "@/lib/services/play-connection";

const schema = z.object({
  packageName: z.string().trim().min(1, "Package name is required."),
  track: z.string().trim().min(1, "Track is required."),
});

/**
 * Create or open a TestLoop campaign for a discovered Play testing track.
 * Production tracks are rejected.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const result = await managePlayTrack({
      userId: user.id,
      packageName: body.packageName,
      track: body.track,
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
