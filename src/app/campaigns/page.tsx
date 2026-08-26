import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listCampaigns } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
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
  const groups = await prisma.googleGroup.findMany({ where: { userId: user.id } });

  return (
    <AppShell title="My testing requests">
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
          tracks: app.tracks.map((track) => ({ id: track.id, name: track.name })),
        }))}
        sources={sources.map((item) => ({ id: item.id, name: item.name }))}
        groups={groups.map((item) => ({ id: item.id, email: item.email }))}
      />
      <div className="mt-8 space-y-3">
        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns" body="Create a closed testing campaign with a target tester count." />
        ) : (
          campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div>
                <div className="font-medium">{campaign.name}</div>
                <div className="text-sm text-slate-400">
                  {campaign.app.name} · target {campaign.targetTesters} · {campaign._count.testerCampaigns} testers
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
