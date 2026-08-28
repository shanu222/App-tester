import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listCampaigns } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import { PublishedRequestsList } from "@/components/campaigns/published-requests-list";
import { getPlayConnection } from "@/lib/services/play-connection";
import { parseTracksSnapshot } from "@/lib/integrations/play-config";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import { isPlayConnectionActive } from "@/lib/play-disconnect";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ appId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [campaigns, playConnection, googlePlayApps, sources, manualApps] = await Promise.all([
    listCampaigns(user.id),
    getPlayConnection(user.id),
    prisma.googlePlayApp.findMany({
      where: { userId: user.id },
      include: { app: { include: { tracks: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.facebookSource.findMany({ where: { userId: user.id } }),
    prisma.app.findMany({
      where: { userId: user.id, syncedFromPlay: false },
      orderBy: { name: "asc" },
    }),
  ]);
  const playConnected = isPlayConnectionActive(playConnection?.status);

  return (
    <AppShell title="Testing Requests">
      <CreateCampaignForm
        initialAppId={params.appId}
        playConnected={playConnected}
        lastSyncAt={playConnection?.lastSyncAt?.toISOString() ?? null}
        apps={[
          ...googlePlayApps.map((row) => ({
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
          })),
          ...manualApps.map((app) => ({
            id: app.id,
            name: app.name,
            packageName: app.packageName,
            source: "manual" as const,
            testingType: app.testingType,
            playStoreUrl: app.playStoreUrl,
            webOptInUrl: app.webOptInUrl,
            iconUrl: app.iconUrl,
            testerTarget: app.testerTarget,
            lastSyncAt: null,
            playTracks: [],
            testingTracks: [],
          })),
        ]}
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
