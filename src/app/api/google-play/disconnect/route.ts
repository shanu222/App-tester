import { handleRouteError, json } from "@/lib/http";
import { requireUser } from "@/auth";
import { disconnectPlay } from "@/lib/services/play-connection";

/** Disconnect Play for this TestLoop account and remove synchronized Play data. Never calls Google Play APIs. */
export async function POST() {
  try {
    const user = await requireUser();
    const result = await disconnectPlay(user.id);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
