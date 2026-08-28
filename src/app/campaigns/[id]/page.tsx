import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getCampaign } from "@/lib/services/campaigns";
import { Badge } from "@/components/ui/badge";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { InfoPopover } from "@/components/ui/info-popover";
import { EmptyState, StatCard } from "@/components/ui/widgets";
import { JsonButton } from "@/components/ui/json-button";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { percent, formatDateTime } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { RecruitmentPostEditor } from "@/components/campaigns/recruitment-post-editor";
import { CopyButton } from "@/components/ui/copy-button";
import { campaignShareUrl } from "@/lib/services/campaigns";
import { PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";
import { CampaignTestersTable } from "@/components/campaigns/campaign-testers-table";
import { TesterRequestActions } from "@/components/campaigns/tester-request-actions";
import { TestingRequestActionButton } from "@/components/campaigns/testing-request-actions";
import { prisma } from "@/lib/db";
import { parseTracksSnapshot, PLAY_API_UNAVAILABLE, playTrackDisplayName, playTrackUiStatus } from "@/lib/integrations/play-config";
import { PlayStatusMark } from "@/components/play/play-status";
import { SourceBadge } from "@/components/ui/source-badge";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import { getPlayConnection } from "@/lib/services/play-connection";
import { detectTrackAccess } from "@/lib/integrations/play-access";
import { participationStatusLabel } from "@/lib/tester-labels";
import { testingTypeExplanation, testingTypeLabel } from "@/lib/campaign-autofill";
import { PLAY_INSTALL_LIMITATION } from "@/lib/integrations/capabilities";
import {
  PLAY_NOT_CONNECTED_FEATURE,
  PLAY_REMOVED_NOTE,
  campaignDependsOnPlayConnection,
} from "@/lib/play-disconnect";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  const shareUrl = campaignShareUrl(campaign.publicSlug);

  const playApp = await prisma.googlePlayApp.findFirst({
    where: {
      userId: user.id,
      OR: [{ appId: campaign.appId }, { packageName: campaign.app.packageName }],
    },
  });
  const playTracks = parseTracksSnapshot(playApp?.tracksSnapshot);
  const playTrack =
    playTracks.find((track) => track.track === campaign.playTrack) ||
    playTracks.find((track) => track.typeGuess === campaign.testingType) ||
    null;
  const trackLabel = playTrack
    ? playTrack.displayName
    : playTrackDisplayName(campaign.playTrack || campaign.testingType.toLowerCase());
  const access = detectTrackAccess(campaign.testingType, playTrack, campaign);
  const trackStatus = playTrackUiStatus({
    exists: Boolean(playTrack || campaign.playTrack),
    releaseStatus: playTrack?.releaseStatus,
  });
  const versionName = playTrack?.releaseName || null;
  const versionCode = playTrack?.versionCodes[0] || null;
  const registeredTesters = campaign.participations.filter((row) => Boolean(row.consentAt)).length;
  const pendingTesters = campaign.participations.filter((row) =>
    ["FAILED", "MANUAL_REQUIRED", "ACCESS_PROCESSING", "ACCEPTED"].includes(row.status),
  ).length;
  const completedTesters = campaign.participations.filter((row) =>
    ["FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status),
  ).length;
  const googlePlayTesters = PLAY_API_UNAVAILABLE;
  const playConnection = await getPlayConnection(user.id);
  const playConnected = playConnection?.status === "CONNECTED";
  const lastSyncAt = playApp?.lastSyncAt || playConnection?.lastSyncAt || null;
  const typeExplainer = testingTypeExplanation(campaign.testingType);
  const requestStatus =
    campaign.status === "ARCHIVED" || campaign.status === "COMPLETED"
      ? "ARCHIVED"
      : campaign.status === "PAUSED" || !campaign.published
        ? campaign.status === "DRAFT"
          ? "DRAFT"
          : "STOPPED"
        : "ACTIVE";
  const playDependent = campaignDependsOnPlayConnection(campaign);
  const playRemoved =
    Boolean(campaign.description?.includes(PLAY_REMOVED_NOTE)) ||
    (playDependent && !playConnected && campaign.status === "ARCHIVED");
  const storeUrl = campaign.playStoreUrl || campaign.app.playStoreUrl || canonicalPlayStoreUrl(campaign.app.packageName);
  const playTestingUrl = playConnected ? campaign.testingUrl || campaign.webOptInUrl : null;
  const publicPageActive = campaign.published && campaign.status === "ACTIVE";

  return (
    <AppShell
      title={campaign.name}
      actions={
        <div className="flex gap-2">
          {!campaign.published && !(playDependent && !playConnected) && campaign.status !== "ARCHIVED" && campaign.status !== "COMPLETED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, publish: true }} label="Publish request" />
          ) : null}
          {playConnected && campaign.app.packageName ? (
            <JsonButton
              url="/api/google-play/apps"
              method="POST"
              body={{ action: "sync", packageName: campaign.app.packageName }}
              label="Refresh from Google Play"
              variant="secondary"
            />
          ) : null}
          {campaign.status === "ACTIVE" && campaign.published ? (
            <TestingRequestActionButton campaignId={id} action="stop" variant="secondary" />
          ) : null}
          {campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, publish: true }} label="Resume testing request" />
          ) : null}
          {campaign.status === "DRAFT" && campaign.published ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "ACTIVE" }} label="Start" />
          ) : null}
          {campaign.status === "ACTIVE" || campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "COMPLETED" }} label="Complete" variant="ghost" />
          ) : null}
          {campaign.status !== "ARCHIVED" && campaign.status !== "COMPLETED" ? (
            <TestingRequestActionButton campaignId={id} action="archive" variant="secondary" />
          ) : (
            <TestingRequestActionButton campaignId={id} action="delete" redirectTo="/campaigns" />
          )}
        </div>
      }
    >
      <section className="mb-6 rounded-card border border-line bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Testing request</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={requestStatus === "ACTIVE" ? "good" : requestStatus === "STOPPED" ? "warn" : "neutral"}>
            {requestStatus}
          </Badge>
          {playRemoved ? <Badge tone="bad">{PLAY_REMOVED_NOTE}</Badge> : null}
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">{campaign.app.name}</h2>
        <div className="mt-2">
          <TestingTypeBadge type={campaign.testingType} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-emerald-700">
            {playConnected ? "● Google Play connected" : "Google Play not connected"}
          </span>
        </div>

        {playDependent && !playConnected ? (
          <p className="mt-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {PLAY_NOT_CONNECTED_FEATURE}{" "}
            <Link href="/play" className="font-medium text-brand hover:underline">
              Connect Google Play
            </Link>
          </p>
        ) : null}

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Testing configuration
            </p>
            <SourceBadge source="google-play" />
          </div>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-muted">Testing type</dt>
              <dd className="mt-1 font-medium text-slate-900">{testingTypeLabel(campaign.testingType)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Track</dt>
              <dd className="mt-1 font-mono text-slate-900">{campaign.playTrack || trackLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Status</dt>
              <dd className="mt-1">
                <PlayStatusMark status={trackStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Testing access method</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {access.developerAccessLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Google Group</dt>
              <dd className="mt-1 text-slate-900">
                {access.groupConfigured === true
                  ? "✓ Yes"
                  : access.groupConfigured === false
                    ? "No"
                    : "Google Group status unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Release</dt>
              <dd className="mt-1 text-slate-900">{versionName || PLAY_API_UNAVAILABLE}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Version code</dt>
              <dd className="mt-1 text-slate-900">{versionCode || PLAY_API_UNAVAILABLE}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted">Google Play testing link</dt>
              <dd className="mt-1 break-all text-slate-700">
                {playTestingUrl || "Not available through Google Play API"}
              </dd>
              {playTestingUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                  href={playTestingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Google Play
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </dl>
          <p className="mt-3 flex items-start gap-1 text-sm leading-6 text-slate-700">
            <span>{typeExplainer.body}</span>
            <InfoPopover title={typeExplainer.title}>{typeExplainer.body}</InfoPopover>
          </p>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Testers</p>
            <SourceBadge source="testloop" />
          </div>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Currently detected</dt>
              <dd className="mt-1 font-medium text-slate-900">{registeredTesters + pendingTesters}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">TestLoop testers</dt>
              <dd className="mt-1 font-medium text-slate-900">{registeredTesters}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Pending TestLoop testers</dt>
              <dd className="mt-1 font-medium text-slate-900">{pendingTesters}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Google Play testers</dt>
              <dd className="mt-1 text-slate-900">{googlePlayTesters}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted">
            Google Play tester list
            <InfoPopover title="Google Play testers">
              Google Play does not expose individual tester addresses through this API. Manage testers in Play Console.
            </InfoPopover>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">
                {registeredTesters} of {campaign.targetTesters} testers joined
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
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            TestLoop activity
          </p>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Request published</dt>
              <dd className="mt-1 text-slate-900">{formatDateTime(campaign.publishedAt)}</dd>
            </div>
          </dl>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-brand">View details</summary>
            <dl className="mt-3 grid gap-3 rounded-control border border-line bg-surface p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Package name</dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">{campaign.app.packageName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Version code</dt>
                <dd className="mt-1 text-slate-700">{versionCode || "Not available"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Group email</dt>
                <dd className="mt-1 break-all text-xs text-slate-700">
                  {access.groupEmail || "Not available through Google Play API"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Last synchronized</dt>
                <dd className="mt-1 text-slate-700">{formatDateTime(lastSyncAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Track</dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">{campaign.playTrack || "—"}</dd>
              </div>
            </dl>
          </details>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="TestLoop testers" value={registeredTesters} />
        <StatCard
          label="Play Console testers"
          value={googlePlayTesters}
          hint="Individual tester email addresses are not available through the Google Play Developer API."
        />
        <StatCard label="Pending" value={pendingTesters} />
        <StatCard label="Completed" value={completedTesters} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Testing links" description="TestLoop, Google Play testing, and the Play Store are separate URLs." />
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">TestLoop tester page</dt>
              <dd className="mt-1 break-all text-slate-700">
                {publicPageActive
                  ? shareUrl || "A public testing page is created when this campaign is saved."
                  : "This TestLoop testing page is not active."}
              </dd>
              {publicPageActive && shareUrl ? (
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
                {playTestingUrl ||
                  (playDependent && !playConnected
                    ? "Connect Google Play to use this feature."
                    : "Not available through Google Play API")}
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
        </Card>

        <Card>
          <CardHeader title={typeExplainer.title} description="TestLoop workflow for this Google Play configuration." />
          <p className="mt-4 text-sm leading-6 text-body">{typeExplainer.body}</p>
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
                  <div className="mt-0.5 text-sm text-muted">
                    Source: TestLoop Accepted Test ·{" "}
                    {row.status === "MANUAL_REQUIRED"
                      ? "Waiting for developer"
                      : participationStatusLabel({
                          status: row.status,
                          playEnrollmentStatus: row.playEnrollmentStatus,
                          joinKind: access.joinKind,
                        })}
                  </div>
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
              {row.status === "MANUAL_REQUIRED" ? (
                <TesterRequestActions participationId={row.id} gmail={row.consentAt ? row.gmail : null} />
              ) : null}
            </div>
          ))
        )}
      </div>

      <SectionLabel className="mb-3 mt-10">Testers</SectionLabel>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="TestLoop testers" value={registeredTesters} />
        <StatCard label="Pending" value={pendingTesters} />
        <StatCard
          label="Google Play testers"
          value={googlePlayTesters}
          hint="Individual tester email addresses are not available through the Google Play Developer API."
        />
      </div>
      <div className="mb-4 rounded-card border border-line bg-surface p-4 text-sm leading-6 text-body">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <SourceBadge source="limitation" />
        </div>
        <p>
          Testers listed here joined by accepting this TestLoop request. Individual Play Console email
          lists, opt-in status, and per-tester installs are not returned by the connected Google Play API.
        </p>
        <p className="mt-2">{PLAY_TESTER_API_LIMITATION}</p>
        <p className="mt-2">{PLAY_INSTALL_LIMITATION}</p>
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
          downloadStatus: "Not available through Google Play API",
        }))}
      />
    </AppShell>
  );
}
