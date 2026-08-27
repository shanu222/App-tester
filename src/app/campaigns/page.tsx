import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listCampaigns } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/card";
import Link from "next/link";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ appId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const campaigns = await listCampaigns(user.id);
  const apps = await prisma.app.findMany({
    where: { userId: user.id },
    include: { tracks: true },
    orderBy: { name: "asc" },
  });
  const sources = await prisma.facebookSource.findMany({ where: { userId: user.id } });

  return (
    <AppShell
      title="My testing requests"
      description="Publish a request, set a tester target, and track who accepts."
    >
      <CreateCampaignForm
        initialAppId={params.appId}
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          packageName: app.packageName,
          playStoreUrl: app.playStoreUrl,
          webOptInUrl: app.webOptInUrl,
          iconUrl: app.iconUrl,
          testingType: app.testingType,
          testerTarget: app.testerTarget,
          tracks: app.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            playTrack: track.trackId,
            testingType: track.testingType,
            syncedFromPlay: track.syncedFromPlay,
          })),
        }))}
        sources={sources.map((item) => ({ id: item.id, name: item.name }))}
      />
      <SectionLabel className="mb-3 mt-10">Published requests</SectionLabel>
      <div className="space-y-2.5">
        {campaigns.length === 0 ? (
          <EmptyState
            title="No testing requests yet"
            body="Publish your first testing request to start finding developers who can test your app."
          />
        ) : (
          campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong hover:bg-surface sm:p-5"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{campaign.name}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {campaign.app.name} · {campaign.testingType.toLowerCase()} · target {campaign.targetTesters} ·{" "}
                  {campaign._count.testerCampaigns} testers
                  {campaign.publicSlug ? ` · /test/${campaign.publicSlug}` : ""}
                </div>
              </div>
              <Badge tone={campaign.status === "ACTIVE" ? "good" : "neutral"}>{campaign.status}</Badge>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
