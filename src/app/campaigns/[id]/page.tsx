import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getCampaign } from "@/lib/services/campaigns";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatCard } from "@/components/ui/widgets";
import { JsonButton } from "@/components/ui/json-button";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { percent } from "@/lib/utils";
import { ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { RecruitmentPostEditor } from "@/components/campaigns/recruitment-post-editor";
import { CopyButton } from "@/components/ui/copy-button";
import { campaignShareUrl } from "@/lib/services/campaigns";
import { PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";
import { CampaignTestersTable } from "@/components/campaigns/campaign-testers-table";
import { TesterRequestActions } from "@/components/campaigns/tester-request-actions";
import { RemoveTestingPostButton } from "@/components/campaigns/remove-testing-post";
import { prisma } from "@/lib/db";
import { parseTracksSnapshot, PLAY_API_UNAVAILABLE, playTrackDisplayName, playTrackUiStatus } from "@/lib/integrations/play-config";
import { PlayStatusMark } from "@/components/play/play-status";
import { SourceBadge } from "@/components/ui/source-badge";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import { getPlayConnection } from "@/lib/services/play-connection";
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
          {!campaign.published && !(playDependent && !playConnected) ? (
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
          {campaign.published || campaign.status === "ACTIVE" || campaign.status === "PAUSED" ? (
            <RemoveTestingPostButton campaignId={id} />
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
          {playRemoved ? <Badge tone="bad">{PLAY_REMOVED_NOTE}</Badge> : null}
        </div>

        {playDependent && !playConnected ? (
          <p className="mt-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {PLAY_NOT_CONNECTED_FEATURE}{" "}
            <Link href="/play" className="font-medium text-brand hover:underline">
              Connect Google Play
            </Link>
          </p>
        ) : null}

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
          {playConnected ? <SourceBadge source="google-play" /> : null}
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
          <CardHeader
            title="How testers join"
            description="You do not enter tester Gmail addresses. Other developers accept this request and confirm the Google account they will use."
          />
          <p className="mt-4 text-sm leading-6 text-body">
            Publish this request, then wait for developers on TestLoop. Open testing testers receive
            the Google Play testing link. Closed and internal testers submit a Gmail request that you
            complete in Play Console, then confirm here as Developer confirmed.
          </p>
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
                      : row.status === "ADDED" || row.status === "INVITATION_READY"
                        ? "Developer confirmed"
                        : row.status.replaceAll("_", " ")}
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
