import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scoring";
import { EmptyState } from "@/components/ui/widgets";
import { DiscoveryForm } from "@/components/discovery/discovery-form";

export default async function DiscoveryPage() {
  const user = await requireUser();
  const sources = await prisma.facebookSource.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } },
    orderBy: { updatedAt: "desc" },
  });
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });

  return (
    <AppShell title="Tester Discovery">
      <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        {FACEBOOK_GROUP_LIMITATION}
      </div>
      {sources.length === 0 ? (
        <EmptyState
          title="No sources yet"
          body="Connect a Facebook Page you manage, or add a manual group label so you can import posts you are authorized to see."
        />
      ) : null}
      <DiscoveryForm
        sources={sources.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          canReadPosts: item.canReadPosts,
          canMonitorReplies: item.canMonitorReplies,
        }))}
        campaigns={campaigns.map((item) => ({ id: item.id, name: item.name }))}
        keywords={settings?.defaultKeywords || DEFAULT_SEARCH_KEYWORDS}
      />
    </AppShell>
  );
}
