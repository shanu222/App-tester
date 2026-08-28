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
import { SourceBadge } from "@/components/ui/source-badge";
import { canonicalPlayStoreUrl } from "@/lib/play-url";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  const stats = await campaignStats(user.id, id);
  const shareUrl = campaignShareUrl(campaign.publicSlug);
  const accessMode = testerAccessMode(campaign.testingType);
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
  const registeredTesters = campaign.testerCampaigns.length;
  const pendingTesters = waitingEmails.length;
  const storeUrl = campaign.playStoreUrl || campaign.app.playStoreUrl || canonicalPlayStoreUrl(campaign.app.packageName);
  const playTestingUrl = campaign.testingUrl || campaign.webOptInUrl;

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

        <div className="mt-4 flex flex-wrap gap-1.5">
          <SourceBadge source="testloop" />
          <SourceBadge source="google-play" />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted">
              {registeredTesters} of {campaign.targetTesters} testers registered in TestLoop
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {percent(registeredTesters, campaign.targetTesters)}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-strong"
            role="progressbar"
            aria-valuenow={percent(registeredTesters, campaign.targetTesters)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, percent(registeredTesters, campaign.targetTesters))}%` }}
            />
          </div>
        </div>

      </section>

      <div className="mb-6 flex gap-3 rounded-card border border-blue-200 bg-brand-soft p-4">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" aria-hidden />
        <p className="text-sm leading-6 text-blue-900">
          Target testers: {campaign.requiredTesters} · Registered in TestLoop: {registeredTesters} ·
          Pending Play Console action: {pendingTesters}. These are TestLoop records. Verify official Play
          Console status before applying for production access.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Target" value={campaign.targetTesters} />
        <StatCard label="TestLoop testers" value={registeredTesters} />
        <StatCard label="Pending Play Console" value={pendingTesters} />
        <StatCard label="Opportunities" value={stats.opportunities} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Testing links" description="TestLoop, Google Play testing, and the Play Store are separate URLs." />
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">TestLoop tester page</dt>
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
                    Open TestLoop tester page
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Google Play testing link</dt>
              <dd className="mt-1 break-all text-slate-700">
                {playTestingUrl || "Not available through Google Play API"}
              </dd>
              {playTestingUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={playTestingUrl} label="Copy Google Play link" />
                  <a
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                    href={playTestingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Google Play
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Google Play Store</dt>
              <dd className="mt-1 break-all text-slate-700">{storeUrl}</dd>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={storeUrl} label="Copy store link" />
                <a
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Play Store
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </div>
            {campaign.playTrack ? (
              <div>
                <dt className="text-xs font-medium text-muted">Play Console track</dt>
                <dd className="mt-1 font-mono text-slate-700">{campaign.playTrack}</dd>
              </div>
            ) : null}
          </dl>
          {accessMode === "MANUAL_EMAIL_LIST" && waitingEmails.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-medium text-muted">Pending Play Console action</div>
                <SourceBadge source="action" />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                These testers are registered in TestLoop. Google Play has not confirmed they were added.
              </p>
              <ul className="mt-2 space-y-2">
                {campaign.testerCampaigns
                  .filter((row) => row.status === "ADDING")
                  .map((row) => {
                    const email = row.detectedEmail || row.tester.email;
                    if (!email) return null;
                    return (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2"
                      >
                        <span className="break-all font-mono text-xs text-slate-700">{email}</span>
                        <CopyButton value={email} label="Copy email" />
                      </li>
                    );
                  })}
              </ul>
              <div className="mt-3">
                <CopyButton value={waitingEmails.join("\n")} label="Copy all pending testers" />
              </div>
            </div>
          ) : null}
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
        <StatCard label="TestLoop testers" value={registeredTesters} />
        <StatCard label="Pending Play Console" value={pendingTesters} />
        <StatCard label="Play opt-in" value="Unavailable" hint="Not returned by the Play Developer API" />
      </div>
      <div className="mb-4 rounded-card border border-line bg-surface p-4 text-sm leading-6 text-body">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <SourceBadge source="limitation" />
        </div>
        <p>
          Individual tester details, opt-in status, and per-tester download/install data are not
          available through the connected Google Play API. The table below is TestLoop registration
          data only.
        </p>
        {accessMode === "MANUAL_EMAIL_LIST" ? (
          <p className="mt-2">{PLAY_TESTER_API_LIMITATION}</p>
        ) : (
          <p className="mt-2">
            Open testing testers join through Google Play using the official testing link. TestLoop
            does not install the app and does not confirm Play opt-in.
          </p>
        )}
      </div>
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
