import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listCampaigns } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import { PublishedRequestsList } from "@/components/campaigns/published-requests-list";
import { getPlayConnection } from "@/lib/services/play-connection";
import { parseTracksSnapshot, playRecordsFromStoredTracks } from "@/lib/integrations/play-config";
import { isPlayConnectionActive } from "@/lib/play-disconnect";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ appId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [campaigns, playConnection, sources, myApps] = await Promise.all([
    listCampaigns(user.id),
    getPlayConnection(user.id),
    prisma.facebookSource.findMany({ where: { userId: user.id } }),
    prisma.app.findMany({
      where: { userId: user.id },
      include: { tracks: true, playApps: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const playConnected = isPlayConnectionActive(playConnection?.status);

  return (
    <AppShell title="Testing Requests">
      <CreateCampaignForm
        flow="publish"
        initialAppId={params.appId}
        playConnected={playConnected}
        lastSyncAt={playConnection?.lastSyncAt?.toISOString() ?? null}
        apps={myApps.map((app) => {
          const cache = app.playApps[0];
          const playTracks = parseTracksSnapshot(cache?.tracksSnapshot);
          return {
            id: app.id,
            name: app.name,
            packageName: app.packageName,
            source: app.syncedFromPlay ? ("play" as const) : ("manual" as const),
            testingType: app.testingType,
            playStoreUrl: app.playStoreUrl,
            webOptInUrl: app.webOptInUrl,
            iconUrl: app.iconUrl,
            testerTarget: app.testerTarget,
            lastSyncAt: (cache?.lastSyncAt || app.lastSyncedAt)?.toISOString() ?? null,
            playTracks: playTracks.length ? playTracks : playRecordsFromStoredTracks(app.tracks),
            testingTracks: app.tracks.map((track) => ({
              id: track.id,
              playTrack: track.trackId,
            })),
          };
        })}
        sources={sources.map((item) => ({ id: item.id, name: item.name }))}
      />
      <PublishedRequestsList
        requests={campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          published: campaign.published,
          testingType: campaign.testingType,
          playTrack: campaign.playTrack,
          targetTesters: campaign.targetTesters,
          durationDays: campaign.durationDays,
          testerCount: campaign._count.testerCampaigns,
          publicSlug: campaign.publicSlug,
          updatedAt: campaign.updatedAt.toISOString(),
          pausedAt: campaign.pausedAt?.toISOString() ?? null,
          appName: campaign.app.name,
          packageName: campaign.app.packageName,
          playConnected,
        }))}
      />
    </AppShell>
  );
}
