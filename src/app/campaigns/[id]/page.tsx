import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { campaignStats, getCampaign } from "@/lib/services/campaigns";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatCard } from "@/components/ui/widgets";
import { JsonButton } from "@/components/ui/json-button";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { percent } from "@/lib/utils";
import { ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";
import { ManualTesterForm } from "@/components/testers/manual-tester-form";
import { RecruitmentPostEditor } from "@/components/campaigns/recruitment-post-editor";
import { CopyButton } from "@/components/ui/copy-button";
import { campaignShareUrl } from "@/lib/services/campaigns";
import { PLAY_TESTER_API_LIMITATION, testerAccessMode } from "@/lib/integrations/play-testers";
import { CampaignTestersTable } from "@/components/campaigns/campaign-testers-table";
import { prisma } from "@/lib/db";
import { parseTracksSnapshot, PLAY_API_UNAVAILABLE, playTrackDisplayName, playTrackUiStatus } from "@/lib/integrations/play-config";
import { PlayStatusMark } from "@/components/play/play-status";

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
  const shareUrl = campaignShareUrl(campaign.publicSlug);
  const accessMode = testerAccessMode(campaign.testingType);
  const pendingEmails = campaign.testerCampaigns
    .map((row) => row.detectedEmail || row.tester.email)
    .filter((email): email is string => Boolean(email));
  const uniqueEmails = [...new Set(pendingEmails)];
  const waitingEmails = campaign.testerCampaigns
    .filter((row) => row.status === "ADDING")
    .map((row) => row.detectedEmail || row.tester.email)
    .filter((email): email is string => Boolean(email));

  const playApp = await prisma.googlePlayApp.findFirst({
    where: { userId: user.id, appId: campaign.appId },
  });
  const playTracks = parseTracksSnapshot(playApp?.tracksSnapshot);
  const playTrack =
    playTracks.find((track) => track.track === campaign.playTrack) ||
    playTracks.find((track) => track.typeGuess === campaign.testingType) ||
    null;
  const trackLabel = playTrack
    ? playTrack.displayName
    : playTrackDisplayName(campaign.playTrack || campaign.testingType.toLowerCase());
  const trackStatus = playTrackUiStatus({
    exists: Boolean(playTrack || campaign.playTrack),
    releaseStatus: playTrack?.releaseStatus,
  });
  const version =
    playTrack?.releaseName ||
    (playTrack?.versionCodes[0] ? `Version code ${playTrack.versionCodes[0]}` : PLAY_API_UNAVAILABLE);
  const activeTesters = campaign.testerCampaigns.filter((row) =>
    ["ADDED", "INVITATION_SENT", "OPT_IN_PENDING", "OPTED_IN", "TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status),
  ).length;
  const pendingTesters = campaign.testerCampaigns.length - activeTesters;

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
          <Badge tone="accent">{trackLabel}</Badge>
          <Badge tone={campaign.status === "ACTIVE" ? "good" : "neutral"}>{campaign.status}</Badge>
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted">App</dt>
            <dd className="mt-1 font-medium text-slate-900">{campaign.app.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Package</dt>
            <dd className="mt-1 font-mono text-xs text-slate-700">{campaign.app.packageName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Track</dt>
            <dd className="mt-1 text-slate-900">{trackLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Status</dt>
            <dd className="mt-1">
              <PlayStatusMark status={trackStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Version</dt>
            <dd className="mt-1 text-slate-900">{version}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">TestLoop campaign</dt>
            <dd className="mt-1 text-slate-900">{campaign.status}</dd>
          </div>
        </dl>

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
              <dt className="text-xs font-medium text-muted">TestLoop testing page</dt>
              <dd className="mt-1 break-all text-slate-700">
                {shareUrl || "A public testing page is created when this campaign is saved."}
              </dd>
              {shareUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={shareUrl} label="Copy TestLoop link" />
                  <a
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open testing page
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Store URL</dt>
              <dd className="mt-1 break-all text-slate-700">
                {campaign.playStoreUrl || campaign.app.playStoreUrl || "Not stored"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Google Play opt-in URL</dt>
              <dd className="mt-1 break-all text-slate-700">
                {campaign.testingUrl || campaign.webOptInUrl || "No testing link configured — do not invent one."}
              </dd>
            </div>
            {campaign.playTrack ? (
              <div>
                <dt className="text-xs font-medium text-muted">Play Console track</dt>
                <dd className="mt-1 font-mono text-slate-700">{campaign.playTrack}</dd>
              </div>
            ) : null}
          </dl>
          {campaign.testingUrl || campaign.webOptInUrl ? (
            <a
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              href={campaign.testingUrl || campaign.webOptInUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open Google Play testing link
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          {accessMode === "MANUAL_EMAIL_LIST" && uniqueEmails.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-xs font-medium text-muted">Copy-ready tester emails</div>
              <p className="mt-1 text-xs leading-5 text-muted">
                Paste these into Play Console → Testers. {waitingEmails.length} still waiting for that step.
              </p>
              <pre className="mt-2 max-h-40 overflow-auto rounded-control border border-line bg-surface p-3 text-xs leading-5 text-slate-700">
                {uniqueEmails.join("\n")}
              </pre>
              <div className="mt-2">
                <CopyButton value={uniqueEmails.join("\n")} label="Copy emails" />
              </div>
            </div>
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
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={campaign.testerCampaigns.length} />
        <StatCard label="Active" value={activeTesters} />
        <StatCard label="Pending" value={pendingTesters} />
      </div>
      {accessMode === "MANUAL_EMAIL_LIST" ? (
        <p className="mb-4 text-sm leading-6 text-body">{PLAY_TESTER_API_LIMITATION}</p>
      ) : (
        <p className="mb-4 text-sm leading-6 text-body">
          Open testing testers join through Google Play using the official testing link. TestLoop
          records registration and does not install the app.
        </p>
      )}
      <CampaignTestersTable
        testers={campaign.testerCampaigns.map((row) => ({
          id: row.id,
          testerId: row.testerId,
          name: row.tester.name,
          email: row.detectedEmail || row.tester.email,
          status: row.status,
          joinedAt: (row.dateEmailConfirmed || row.createdAt).toISOString(),
          lastActivityAt: (row.lastActivityAt || row.updatedAt).toISOString(),
        }))}
      />
    </AppShell>
  );
}
