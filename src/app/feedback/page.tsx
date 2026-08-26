import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { FeedbackForm } from "@/components/feedback/feedback-form";

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
    <AppShell title="Feedback">
      <FeedbackForm
        options={testers.map((row) => ({
          id: row.id,
          label: `${row.tester.name || row.tester.email} · ${row.campaign.name}`,
        }))}
      />
      <div className="mt-8 space-y-3">
        {rows.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-800 p-4 text-sm">
            <div className="text-xs text-slate-500">
              {formatDateTime(item.createdAt)} · {item.tester.name} · {item.campaign.name}
            </div>
            <p className="mt-2">Overall: {item.overall ?? "—"}</p>
            <p>Bugs: {item.bugs || "—"}</p>
            <p>UI: {item.uiIssues || "—"}</p>
            <p>Performance: {item.performance || "—"}</p>
            <p>Suggestions: {item.suggestions || "—"}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
