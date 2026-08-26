import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { readCredentials } from "@/lib/integrations/store";
import { searchPlayApps, listPlayTracks } from "@/lib/integrations/play";
import type { ServiceAccountJson } from "@/lib/integrations/play";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import { statusFromPlayTracks } from "@/lib/services/apps";

async function playClient(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE_PLAY" } },
  });
  const creds = readCredentials(integration?.encryptedCredentials);
  if (!creds?.serviceAccountJson || integration?.status !== "CONNECTED") {
    throw new AppError(
      "Google Play is not connected. Upload a service account and grant it Play Console access first.",
    );
  }
  return JSON.parse(creds.serviceAccountJson) as ServiceAccountJson;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (isDemoMode()) {
      return json({ apps: [], newApps: [], demo: true, message: "DEMO MODE does not call Google Play." });
    }
    const sa = await playClient(user.id);
    const result = await searchPlayApps(sa);
    if (!result.ok) {
      return json({ error: result.error, manualFallback: result.manualFallback, apps: [], newApps: [] }, 409);
    }
    const existing = await prisma.app.findMany({
      where: { userId: user.id },
      select: { packageName: true, name: true, googlePlayStatus: true },
    });
    const known = new Map(existing.map((app) => [app.packageName, app]));
    const newApps = result.data.filter((app) => !known.has(app.packageName));
    return json({ apps: result.data, newApps, existing: existing.length });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (isDemoMode()) {
      return json({
        apps: [],
        newApps: [],
        demo: true,
        message: "DEMO MODE does not call Google Play. Add apps manually.",
      });
    }
    const body = await request.json().catch(() => ({}));
    const addPackageNames = Array.isArray((body as { addPackageNames?: unknown }).addPackageNames)
      ? ((body as { addPackageNames: string[] }).addPackageNames)
      : [];
    const sa = await playClient(user.id);
    const result = await searchPlayApps(sa);
    if (!result.ok) {
      return json({ error: result.error, manualFallback: result.manualFallback, apps: [], newApps: [] }, 409);
    }

    const existing = await prisma.app.findMany({ where: { userId: user.id } });
    const byPackage = new Map(existing.map((app) => [app.packageName, app]));
    const addSet = new Set(addPackageNames.map((item) => item.trim()));
    const updated = [];
    const imported = [];
    const newApps = [];
    const conflicts = [];

    for (const playApp of result.data) {
      const local = byPackage.get(playApp.packageName);
      const tracks = await listPlayTracks(sa, playApp.packageName);
      const derived = tracks.ok ? statusFromPlayTracks(tracks.data) : null;

      if (!local) {
        if (addSet.has(playApp.packageName)) {
          const app = await prisma.app.create({
            data: {
              userId: user.id,
              name: playApp.displayName,
              packageName: playApp.packageName,
              playStoreUrl: canonicalPlayStoreUrl(playApp.packageName),
              googlePlayStatus: derived || "NOT_CONFIGURED",
              testingType:
                derived === "INTERNAL_TESTING" ? "INTERNAL" : derived === "OPEN_TESTING" ? "OPEN" : "CLOSED",
              syncedFromPlay: true,
              lastSyncedAt: new Date(),
            },
          });
          imported.push(app);
          byPackage.set(app.packageName, app);
        } else {
          newApps.push({
            name: playApp.displayName,
            packageName: playApp.packageName,
            playStoreUrl: canonicalPlayStoreUrl(playApp.packageName),
            googlePlayStatus: derived,
            label: "New app available",
          });
        }
        continue;
      }

      const data: {
        lastSyncedAt: Date;
        syncedFromPlay: boolean;
        playConflictNote?: string | null;
      } = {
        lastSyncedAt: new Date(),
        syncedFromPlay: true,
      };
      if (derived && derived !== local.googlePlayStatus) {
        data.playConflictNote = `Google Play currently lists this as ${derived.replaceAll("_", " ").toLowerCase()}. My Apps still shows ${local.googlePlayStatus.replaceAll("_", " ").toLowerCase()}. Review before changing.`;
        conflicts.push({
          packageName: local.packageName,
          stored: local.googlePlayStatus,
          play: derived,
        });
      } else {
        data.playConflictNote = null;
      }
      const app = await prisma.app.update({ where: { id: local.id }, data });
      updated.push(app);
    }

    return json({
      apps: updated,
      imported,
      newApps,
      conflicts,
      message:
        newApps.length > 0
          ? `${newApps.length} Google Play app(s) are not in My Apps yet.`
          : "My Apps is in sync with accessible Google Play apps.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
