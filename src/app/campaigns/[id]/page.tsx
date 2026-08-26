import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { campaignStats, getCampaign } from "@/lib/services/campaigns";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatusBadge, StatCard } from "@/components/ui/widgets";
import { JsonButton } from "@/components/ui/json-button";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { percent } from "@/lib/utils";
import { ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";
import { ManualTesterForm } from "@/components/testers/manual-tester-form";
import { RecruitmentPostEditor } from "@/components/campaigns/recruitment-post-editor";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  const stats = await campaignStats(user.id, id);
  const remaining = Math.max(0, campaign.targetTesters - stats.optedIn);

  return (
    <AppShell
      title={campaign.name}
      actions={
        <div className="flex gap-2">
          {!campaign.published ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, publish: true }} label="Publish request" />
          ) : null}
          {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "ACTIVE" }} label="Start" />
          ) : null}
          {campaign.status === "ACTIVE" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "PAUSED" }} label="Pause" variant="secondary" />
          ) : null}
          {campaign.status === "ACTIVE" || campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "COMPLETED" }} label="Complete" variant="ghost" />
          ) : null}
        </div>
      }
    >
      <section className="mb-6 rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={campaign.published ? "good" : "neutral"}>
            {campaign.published ? "Published" : "Unpublished"}
          </Badge>
          <Badge tone="accent">{campaign.testingType} testing</Badge>
        </div>

        <p className="mt-3 text-sm text-body">
          <span className="font-medium text-slate-900">{campaign.app.name}</span>{" "}
          <span className="font-mono text-xs text-muted">{campaign.app.packageName}</span>
        </p>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted">
              {stats.optedIn} of {campaign.targetTesters} testers opted in
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {percent(stats.optedIn, campaign.targetTesters)}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-strong"
            role="progressbar"
            aria-valuenow={percent(stats.optedIn, campaign.targetTesters)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, percent(stats.optedIn, campaign.targetTesters))}%` }}
            />
          </div>
        </div>

        {campaign.app.playStoreUrl ? (
          <a
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            href={campaign.app.playStoreUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open Google Play
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </section>

      <div className="mb-6 flex gap-3 rounded-card border border-blue-200 bg-brand-soft p-4">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" aria-hidden />
        <p className="text-sm leading-6 text-blue-900">
          Required testers: {campaign.requiredTesters} · Opted in: {stats.optedIn} · Remaining: {remaining} ·
          Active-day window: {campaign.requiredActiveDays}. Based on recorded tester activity — verify official
          Play Console status before applying for production access. TestLoop does not determine Google&apos;s
          eligibility.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Target" value={campaign.targetTesters} />
        <StatCard label="Opportunities" value={stats.opportunities} />
        <StatCard label="Replies" value={stats.replies} />
        <StatCard label="Gmail addresses" value={stats.emails} />
        <StatCard label="Added" value={stats.added} />
        <StatCard label="Opted in" value={stats.optedIn} />
        <StatCard label="Testing" value={stats.testing} />
        <StatCard label="Feedback" value={stats.feedback} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Testing links" description="Store and opt-in URLs are stored separately." />
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">Store URL</dt>
              <dd className="mt-1 break-all text-slate-700">
                {campaign.playStoreUrl || campaign.app.playStoreUrl || "Not stored"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Testing / opt-in URL</dt>
              <dd className="mt-1 break-all text-slate-700">
                {campaign.webOptInUrl || "No testing link configured — do not invent one."}
              </dd>
            </div>
          </dl>
          {campaign.webOptInUrl ? (
            <a
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              href={campaign.webOptInUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open testing link
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
            In-app telemetry token:{" "}
            <span className="font-mono text-slate-600">{campaign.telemetryToken}</span> · POST /api/telemetry
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Manual override"
            description="Use only when Google APIs cannot complete the action automatically."
          />
          <div className="mt-5">
            <ManualTesterForm campaignId={campaign.id} />
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <PasteReplyForm campaignId={campaign.id} />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <RecruitmentPostEditor
          appName={campaign.app.name}
          playStoreUrl={campaign.playStoreUrl || campaign.app.playStoreUrl}
        />
      </div>

      <SectionLabel className="mb-1.5 mt-10">Developer testers</SectionLabel>
      <p className="mb-3 text-xs leading-5 text-muted">
        Gmail is visible here only after the developer explicitly consented. It is never shown on the public
        request page.
      </p>
      <div className="mb-10 space-y-2.5">
        {campaign.participations.length === 0 ? (
          <EmptyState
            title="No testers yet"
            body="When another developer accepts this request and consents to share Gmail, they appear here."
          />
        ) : (
          campaign.participations.map((row) => (
            <div key={row.id} className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/developers/${row.tester.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {row.tester.developerName || row.tester.name}
                  </Link>
                  <div className="mt-0.5 text-sm text-muted">{row.status.replaceAll("_", " ")}</div>
                </div>
                <div className="text-sm text-slate-700">
                  {row.consentAt ? row.gmail : <span className="text-muted">Gmail hidden until consent</span>}
                </div>
              </div>
              {row.lastError ? (
                <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
                  {row.lastError}
                </p>
              ) : null}
              {row.status === "MANUAL_REQUIRED" || row.status === "FAILED" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {row.gmail ? (
                    <span className="rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-xs text-slate-600">
                      {row.gmail}
                    </span>
                  ) : null}
                  <JsonButton
                    url="/api/network"
                    body={{ action: "retry-access", participationId: row.id }}
                    label="Retry"
                    variant="secondary"
                  />
                  <JsonButton
                    url="/api/network"
                    body={{ action: "manual-added", participationId: row.id }}
                    label="Mark manually added"
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <SectionLabel className="mb-3 mt-10">Testers</SectionLabel>
      {campaign.testerCampaigns.length === 0 ? (
        <EmptyState title="No tester records yet" body="Tester rows appear as access and opt-in events are recorded." />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Access</Th>
                <Th>Opt-in</Th>
                <Th>Testing</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {campaign.testerCampaigns.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link className="font-medium text-brand hover:underline" href={`/testers/${row.testerId}`}>
                      {row.tester.name || "Unnamed"}
                    </Link>
                  </Td>
                  <Td className="text-muted">{row.detectedEmail || row.tester.email || "—"}</Td>
                  <Td>{row.accessAdded ? "Added" : "—"}</Td>
                  <Td>{row.optedIn ? "Opted in" : "Pending"}</Td>
                  <Td className="text-muted">
                    {["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status)
                      ? "Activity detected"
                      : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AppShell>
  );
}
