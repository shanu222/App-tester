import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/widgets";
import { TIMELINE_STEPS, TESTER_STATUS_LABELS } from "@/lib/status";
import { SourceBadge } from "@/components/ui/source-badge";
import { formatDateTime } from "@/lib/utils";
import { TesterActions } from "@/components/testers/tester-actions";
import { JsonButton } from "@/components/ui/json-button";
import { Card, CardHeader } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

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
      campaigns: { include: { campaign: { include: { app: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      feedback: true,
      invitations: true,
    },
  });
  if (!tester) notFound();
  const row = tester.campaigns[0];

  return (
    <AppShell title={tester.name || tester.email || "Tester"}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader title="Tester details" />
            {row ? <StatusBadge status={row.status} /> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SourceBadge source="testloop" />
            <SourceBadge source="limitation" />
          </div>

          <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Email</dt>
              <dd className="mt-1 truncate text-slate-700">{tester.email || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Source</dt>
              <dd className="mt-1 truncate text-slate-700">{tester.sourceLabel || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Campaign</dt>
              <dd className="mt-1 truncate text-slate-700">{row?.campaign.name || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">App</dt>
              <dd className="mt-1 truncate text-slate-700">{row?.campaign.app.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Access</dt>
              <dd className="mt-1 text-slate-700">
                {row?.accessAdded
                  ? "Confirmed by developer in Play Console"
                  : "Not confirmed by Google Play API"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Opt-in</dt>
              <dd className="mt-1 text-slate-700">
                {row?.optedIn ? "Recorded in TestLoop" : "Unavailable through Google Play API"}
              </dd>
            </div>
          </dl>

          {row ? <TesterActions testerId={tester.id} testerCampaignId={row.id} email={tester.email} /> : null}
          {row ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <JsonButton
                url="/api/google-play/testers/access"
                body={{ testerCampaignId: row.id }}
                label="Grant testing access"
                variant="secondary"
              />
              <JsonButton
                url="/api/google-play/testers/confirm"
                body={{ testerCampaignId: row.id }}
                label="Mark added in Play Console"
                variant="ghost"
              />
              <JsonButton
                url="/api/gmail/send"
                body={{ testerCampaignId: row.id, sendEmail: false }}
                label="Generate invitation"
              />
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Status timeline" />
          <ol className="mt-5 space-y-1">
            {TIMELINE_STEPS.map((step) => {
              const hit = tester.statusHistory.find((item) => item.toStatus === step);
              return (
                <li
                  key={step}
                  className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {hit ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-line-strong" aria-hidden />
                    )}
                    <span className={hit ? "truncate font-medium text-slate-900" : "truncate text-muted"}>
                      {TESTER_STATUS_LABELS[step]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {hit ? formatDateTime(hit.createdAt) : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
