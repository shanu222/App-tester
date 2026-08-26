import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { OpportunityList } from "@/components/opportunities/opportunity-list";
import { relevanceLabel } from "@/lib/scoring";

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const opportunities = await prisma.opportunity.findMany({
    where: { userId: user.id, skipped: false, ignored: false },
    include: {
      source: true,
      commentDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { relevanceScore: "desc" },
    take: 80,
  });
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  return (
    <AppShell title="Opportunities">
      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          body="Run discovery on a Page you manage, or import a recent post from a group you belong to."
        />
      ) : (
        <OpportunityList
          campaigns={campaigns}
          items={opportunities.map((item) => ({
            id: item.id,
            personName: item.personName,
            postContent: item.postContent,
            groupName: item.groupName,
            postTimestamp: item.postTimestamp?.toISOString() || null,
            postLink: item.postLink,
            relevanceScore: item.relevanceScore,
            relevance: relevanceLabel(item.relevanceScore),
            matchedKeywords: item.matchedKeywords,
            testingIntent: item.testingIntent,
            previousContact: item.previousContact,
            reciprocal: item.reciprocalLanguage,
            whyMatched: item.whyMatched,
            draftId: item.commentDrafts[0]?.id || null,
            draftStatus: item.commentDrafts[0]?.status || null,
            draftBody: item.commentDrafts[0]?.body || null,
          }))}
        />
      )}
    </AppShell>
  );
}
