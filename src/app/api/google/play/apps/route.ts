import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { readCredentials } from "@/lib/integrations/store";
import { searchPlayApps, listPlayTracks, testingLinkForPackage } from "@/lib/integrations/play";
import type { ServiceAccountJson } from "@/lib/integrations/play";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST() {
  try {
    const user = await requireUser();
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: user.id, provider: "GOOGLE_PLAY" } },
    });
    if (isDemoMode()) {
      return json({
        apps: [],
        demo: true,
        message: "DEMO MODE does not call Google Play. Add apps manually.",
      });
    }
    const creds = readCredentials(integration?.encryptedCredentials);
    if (!creds?.serviceAccountJson || integration?.status !== "CONNECTED") {
      throw new AppError(
        "Google Play is not connected. Upload a service account and grant it Play Console access first.",
      );
    }
    const sa = JSON.parse(creds.serviceAccountJson) as ServiceAccountJson;
    const result = await searchPlayApps(sa);
    if (!result.ok) {
      return json({
        error: result.error,
        manualFallback: result.manualFallback,
        apps: [],
      }, 409);
    }
    const upserted = [];
    for (const playApp of result.data) {
      const app = await prisma.app.upsert({
        where: {
          userId_packageName: { userId: user.id, packageName: playApp.packageName },
        },
        update: {
          name: playApp.displayName,
          syncedFromPlay: true,
          lastSyncedAt: new Date(),
          webOptInUrl: testingLinkForPackage(playApp.packageName) || undefined,
        },
        create: {
          userId: user.id,
          name: playApp.displayName,
          packageName: playApp.packageName,
          syncedFromPlay: true,
          lastSyncedAt: new Date(),
          webOptInUrl: testingLinkForPackage(playApp.packageName) || undefined,
          playStoreUrl: `https://play.google.com/store/apps/details?id=${playApp.packageName}`,
        },
      });
      const tracks = await listPlayTracks(sa, playApp.packageName);
      if (tracks.ok) {
        for (const track of tracks.data) {
          if (track.typeGuess === "PRODUCTION") continue;
          await prisma.testingTrack.upsert({
            where: { id: `${app.id}-${track.track}` },
            update: { name: track.track },
            create: {
              id: `${app.id}-${track.track}`.slice(0, 64),
              appId: app.id,
              name: track.track,
              trackId: track.track,
              testingType:
                track.typeGuess === "OPEN"
                  ? "OPEN"
                  : track.typeGuess === "INTERNAL"
                    ? "INTERNAL"
                    : "CLOSED",
              syncedFromPlay: true,
              testingLink: testingLinkForPackage(playApp.packageName) || undefined,
            },
          });
        }
      }
      upserted.push(app);
    }
    return json({ apps: upserted });
  } catch (error) {
    return handleRouteError(error);
  }
}
