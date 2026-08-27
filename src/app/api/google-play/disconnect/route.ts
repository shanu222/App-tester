import { handleRouteError, json } from "@/lib/http";
import { requireUser } from "@/auth";
import { disconnectPlay } from "@/lib/services/play-connection";

/** Remove the developer's stored Play credentials and discovered app cache. */
export async function POST() {
  try {
    const user = await requireUser();
    const result = await disconnectPlay(user.id);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
