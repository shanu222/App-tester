import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listAppsWithStats } from "@/lib/services/apps";
import { MyAppsWorkspace } from "@/components/apps/my-apps-workspace";
import { prisma } from "@/lib/db";
import { getPlayConnection } from "@/lib/services/play-connection";
import { parseTracksSnapshot } from "@/lib/integrations/play-config";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import { isPlayConnectionActive } from "@/lib/play-disconnect";

export default async function AppsPage() {
  const user = await requireUser();
  const [apps, playConnection, googlePlayApps] = await Promise.all([
    listAppsWithStats(user.id),
    getPlayConnection(user.id),
    prisma.googlePlayApp.findMany({
      where: { userId: user.id },
      include: { app: { include: { tracks: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const playConnected = isPlayConnectionActive(playConnection?.status);

  return (
    <AppShell title="My Apps">
      <MyAppsWorkspace
        playConnected={playConnected}
        lastSyncAt={playConnection?.lastSyncAt?.toISOString() ?? null}
        playApps={googlePlayApps.map((row) => ({
          id: row.appId || "",
          name: row.app?.name || row.name,
          packageName: row.packageName,
          source: "play" as const,
          playStoreUrl: row.app?.playStoreUrl || canonicalPlayStoreUrl(row.packageName),
          webOptInUrl: row.app?.webOptInUrl || null,
          iconUrl: row.iconUrl || row.app?.iconUrl || null,
          testerTarget: row.app?.testerTarget ?? 12,
          lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
          playTracks: parseTracksSnapshot(row.tracksSnapshot),
          testingTracks: (row.app?.tracks || []).map((track) => ({
            id: track.id,
            playTrack: track.trackId,
          })),
        }))}
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          packageName: app.packageName,
          playStoreUrl: app.playStoreUrl,
          webOptInUrl: app.webOptInUrl,
          iconUrl: app.iconUrl,
          googlePlayStatus: app.googlePlayStatus,
          testingType: app.testingType,
          testingTypes: app.testingTypes,
          testerTarget: app.testerTarget,
          playConflictNote: app.playConflictNote,
          syncedFromPlay: app.syncedFromPlay,
          campaignStatus: app.campaignStatus,
          testersAdded: app.testersAdded,
          testersRegistered: app.testerCount,
          testingActivity: app.testingActivity,
          tracks: app.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            testingType: track.testingType,
          })),
          campaign: app.campaign
            ? {
                id: app.campaign.id,
                name: app.campaign.name,
                status: app.campaign.status,
                published: app.campaign.published,
              }
            : null,
        }))}
      />
    </AppShell>
  );
}
