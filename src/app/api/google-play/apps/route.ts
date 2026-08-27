import { z } from "zod";
import { handleRouteError, json, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import {
  listDiscoveredApps,
  refreshFromGooglePlay,
  selectPlayApp,
  syncPackageTracks,
} from "@/lib/services/play-connection";

/** Cached list of applications Google reported for this developer. */
export async function GET() {
  try {
    const user = await requireUser();
    return json({ apps: await listDiscoveredApps(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

const postSchema = z.object({
  action: z.enum(["refresh", "select", "sync"]).default("refresh"),
  packageName: z.string().trim().optional(),
});

/** `refresh` re-queries Google; `select` marks a discovered app as managed. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, postSchema);

    if (body.action === "select") {
      if (!body.packageName) {
        return json({ error: "Choose an app to manage." }, 400);
      }
      const result = await selectPlayApp({ userId: user.id, packageName: body.packageName });
      const discovery = await syncPackageTracks({
        userId: user.id,
        packageName: body.packageName,
      }).catch(() => null);
      return json({
        selected: result.packageName,
        appId: result.app.id,
        apps: await listDiscoveredApps(user.id),
        discovery,
      });
    }

    if (body.action === "sync") {
      if (body.packageName) {
        const discovery = await syncPackageTracks({
          userId: user.id,
          packageName: body.packageName,
        });
        return json({ discovery, apps: await listDiscoveredApps(user.id) });
      }
      const refreshed = await refreshFromGooglePlay(user.id);
      return json(refreshed);
    }

    const refreshed = await refreshFromGooglePlay(user.id);
    return json(refreshed);
  } catch (error) {
    return handleRouteError(error);
  }
}
