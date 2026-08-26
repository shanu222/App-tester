import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/widgets";
import { TIMELINE_STEPS } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import { TesterActions } from "@/components/testers/tester-actions";
import { JsonButton } from "@/components/ui/json-button";

export default async function TesterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const tester = await prisma.tester.findFirst({
    where: { id, userId: user.id },
    include: {
      campaigns: { include: { campaign: { include: { app: true, googleGroup: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      feedback: true,
      invitations: true,
    },
  });
  if (!tester) notFound();
  const row = tester.campaigns[0];

  return (
    <AppShell title={tester.name || tester.email || "Tester"}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 p-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{tester.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd>{tester.sourceLabel || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Campaign</dt>
              <dd>{row?.campaign.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">App</dt>
              <dd>{row?.campaign.app.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Access</dt>
              <dd>{row?.accessAdded ? "✅ Added" : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Opt-in</dt>
              <dd>{row?.optedIn ? "✅ Opted in" : "⏳ Pending"}</dd>
            </div>
          </dl>
          {row ? <div className="mt-4"><StatusBadge status={row.status} /></div> : null}
          {row ? <TesterActions testerId={tester.id} testerCampaignId={row.id} email={tester.email} /> : null}
          {row ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <JsonButton
                url="/api/google/groups/members"
                body={{ testerCampaignId: row.id }}
                label="Add to Google Group"
                variant="secondary"
              />
              <JsonButton
                url="/api/google/groups/members"
                body={{ testerCampaignId: row.id, confirmManual: true }}
                label="Confirm membership"
                variant="ghost"
              />
              <JsonButton
                url="/api/gmail/send"
                body={{ testerCampaignId: row.id, sendEmail: false }}
                label="Generate invitation"
              />
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-800 p-5">
          <h2 className="font-medium">Status timeline</h2>
          <ol className="mt-4 space-y-3">
            {TIMELINE_STEPS.map((step) => {
              const hit = tester.statusHistory.find((item) => item.toStatus === step);
              return (
                <li key={step} className="flex items-center justify-between text-sm">
                  <span className={hit ? "text-emerald-200" : "text-slate-500"}>{step.replaceAll("_", " ")}</span>
                  <span className="text-slate-500">{hit ? formatDateTime(hit.createdAt) : "—"}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
