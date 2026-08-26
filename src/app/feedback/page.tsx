import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/widgets";

export default async function FeedbackPage() {
  const user = await requireUser();
  const rows = await prisma.feedback.findMany({
    where: { userId: user.id },
    include: { tester: true, campaign: true },
    orderBy: { createdAt: "desc" },
  });
  const testers = await prisma.testerCampaign.findMany({
    where: { userId: user.id, status: { in: ["TESTING", "FEEDBACK_REQUESTED", "OPTED_IN"] } },
    include: { tester: true, campaign: true },
  });
  return (
    <AppShell title="Feedback" description="Structured tester feedback recorded against your campaigns.">
      <FeedbackForm
        options={testers.map((row) => ({
          id: row.id,
          label: `${row.tester.name || row.tester.email} · ${row.campaign.name}`,
        }))}
      />

      <SectionLabel className="mb-3 mt-10">Received feedback</SectionLabel>
      {rows.length === 0 ? (
        <EmptyState
          title="No feedback yet"
          body="Feedback appears here once a tester submits it for one of your campaigns."
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((item) => (
            <div key={item.id} className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-900">
                  {item.tester.name} · {item.campaign.name}
                </div>
                <div className="flex items-center gap-2">
                  {item.overall != null ? (
                    <Badge tone={item.overall >= 4 ? "good" : item.overall >= 3 ? "warn" : "bad"}>
                      Overall {item.overall} / 5
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                {[
                  ["Bugs", item.bugs],
                  ["UI issues", item.uiIssues],
                  ["Performance", item.performance],
                  ["Suggestions", item.suggestions],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs font-medium text-muted">{label}</dt>
                    <dd className="mt-1 leading-6 text-slate-700">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
