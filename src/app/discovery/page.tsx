import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scoring";
import { EmptyState } from "@/components/ui/widgets";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { AlertTriangle } from "lucide-react";

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
    <AppShell title="Tester Discovery" description="Import posts you are authorized to see and score them for testing intent.">
      <div className="mb-6 flex gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-700" aria-hidden />
        <p className="text-sm leading-6 text-amber-800">{FACEBOOK_GROUP_LIMITATION}</p>
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
