"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import { AppMark } from "@/components/brand/app-mark";
import { PlayStatusMark } from "@/components/play/play-status";
import type { PlayTrackRecord } from "@/lib/integrations/types";
import type { ConfigurationSummary, TestingRecommendation } from "@/lib/integrations/play-config";
import {
  PLAY_API_UNAVAILABLE,
  detectTestingConfiguration,
  playConsoleSetupUrl,
  playTrackUiStatus,
  recommendTestingMode,
} from "@/lib/integrations/play-config";
import { formatPlayTimestamp } from "@/components/play/play-connection-panel";
import { PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";

export type PlayAppView = {
  id: string;
  packageName: string;
  name: string;
  iconUrl: string | null;
  selected: boolean;
  appId: string | null;
  lastSyncAt: string | null;
  tracks: PlayTrackRecord[];
  configuration: ConfigurationSummary;
};

type Filter = "all" | "testing" | "none" | "open" | "closed" | "internal";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "testing", label: "Testing configured" },
  { id: "none", label: "No testing configured" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "internal", label: "Internal" },
];

export function PlayAppsPanel({
  apps,
  lastSyncAt,
}: {
  apps: PlayAppView[];
  lastSyncAt?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(
    apps.find((app) => app.selected)?.packageName || apps[0]?.packageName || null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTracks, setNewTracks] = useState<string[]>([]);

  const selected = apps.find((app) => app.packageName === selectedPackage) || null;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (filter === "testing" && app.configuration.testingTrackCount === 0) return false;
      if (filter === "none" && app.configuration.testingTrackCount > 0) return false;
      if (filter === "open" && !app.configuration.open) return false;
      if (filter === "closed" && !app.configuration.closed) return false;
      if (filter === "internal" && !app.configuration.internal) return false;
      if (!needle) return true;
      return (
        app.name.toLowerCase().includes(needle) ||
        app.packageName.toLowerCase().includes(needle)
      );
    });
  }, [apps, filter, query]);

  async function refresh() {
    setPending("refresh");
    setError(null);
    try {
      const response = await fetch("/api/google-play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || `Could not refresh Google Play (HTTP ${response.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
    } finally {
      setPending(null);
    }
  }

  async function loadApp(app: PlayAppView) {
    setSelectedPackage(app.packageName);
    setNewTracks([]);
    setError(null);
    setPending(`sync:${app.packageName}`);
    try {
      if (!app.selected) {
        const selectResponse = await fetch("/api/google-play/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "select", packageName: app.packageName }),
        });
        const selectData = await selectResponse.json();
        if (!selectResponse.ok) {
          setError(selectData?.error || "This app could not be selected.");
          return;
        }
      } else {
        const syncResponse = await fetch("/api/google-play/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync", packageName: app.packageName }),
        });
        const syncData = await syncResponse.json();
        if (!syncResponse.ok) {
          setError(syncData?.error || "Could not read tracks for this app.");
          return;
        }
        if (Array.isArray(syncData?.discovery?.newTracks)) {
          setNewTracks(syncData.discovery.newTracks);
        }
      }
      router.refresh();
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
    } finally {
      setPending(null);
    }
  }

  async function manageTrack(packageName: string, track: string) {
    setPending(`manage:${packageName}:${track}`);
    setError(null);
    try {
      const response = await fetch("/api/google-play/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName, track }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Could not open that testing campaign.");
        return;
      }
      window.location.href = `/campaigns/${data.campaignId}`;
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Your Google Play apps"
          description="Applications Google reports for this connection. Play Console remains the source of truth."
          action={
            <Button variant="secondary" onClick={refresh} disabled={pending !== null}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              {pending === "refresh" ? "Refreshing…" : "Refresh from Google Play"}
            </Button>
          }
        />
        <p className="mt-2 text-xs text-muted">
          Last synchronized: {formatPlayTimestamp(lastSyncAt) || "Not yet synchronized"}
        </p>

        {error ? (
          <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : null}

        {apps.length === 0 ? (
          <div className="mt-5 border-t border-line pt-5">
            <EmptyState
              title="No apps discovered yet"
              body="Refresh from Google Play to retrieve the applications this account can access. App discovery uses the Play Developer Reporting API, which must be enabled on the same Google Cloud project."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
              <div className="relative min-w-56 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search apps…"
                  aria-label="Search apps"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={
                      filter === item.id
                        ? "rounded-control border border-brand bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand"
                        : "rounded-control border border-line px-3 py-1.5 text-sm text-body transition-colors hover:bg-surface"
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="mt-5 text-sm text-muted">No apps match that search.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {visible.map((app) => (
                  <li key={app.id}>
                    <PlayAppCard
                      app={app}
                      selected={selected?.packageName === app.packageName}
                      pending={pending}
                      onSelect={() => loadApp(app)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {selected ? (
        <SelectedAppDetail
          app={selected}
          pending={pending}
          newTracks={newTracks}
          onManage={manageTrack}
        />
      ) : null}
    </div>
  );
}

function PlayAppCard({
  app,
  selected,
  pending,
  onSelect,
}: {
  app: PlayAppView;
  selected: boolean;
  pending: string | null;
  onSelect: () => void;
}) {
  const config = app.configuration;
  return (
    <div
      className={
        selected
          ? "rounded-control border border-brand bg-white p-4 shadow-card"
          : "rounded-control border border-line bg-white p-4 shadow-card"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <AppMark name={app.name} src={app.iconUrl} />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{app.name}</div>
            <div className="mt-0.5 truncate font-mono text-xs text-muted">{app.packageName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="good">Google Play · Connected</Badge>
              <span className="text-xs text-muted">
                {config.testingTrackCount > 0
                  ? `${config.testingTrackCount} track${config.testingTrackCount === 1 ? "" : "s"} detected`
                  : "No testing track"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant={selected ? "secondary" : "primary"}
          onClick={onSelect}
          disabled={pending !== null}
        >
          {pending === `sync:${app.packageName}` ? "Loading…" : "Manage testing"}
        </Button>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <ModeRow
          label="Internal testing"
          exists={config.internal}
          active={config.internalActive}
        />
        <ModeRow label="Closed testing" exists={config.closed} active={config.closedActive} extra={config.closedCount > 1 ? `${config.closedCount} tracks` : null} />
        <ModeRow label="Open testing" exists={config.open} active={config.openActive} />
      </dl>
      <p className="mt-3 text-xs text-muted">
        Last synchronized: {formatPlayTimestamp(app.lastSyncAt) || "Not yet synchronized"}
      </p>
    </div>
  );
}

function ModeRow({
  label,
  exists,
  active,
  extra,
}: {
  label: string;
  exists: boolean;
  active: boolean;
  extra?: string | null;
}) {
  const status = playTrackUiStatus({
    exists,
    releaseStatus: active ? "completed" : exists ? null : null,
  });
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1">
        <PlayStatusMark status={exists && !active ? { kind: "configured", label: "Track configured", symbol: "✓" } : status} />
        {extra ? <span className="ml-2 text-xs text-muted">{extra}</span> : null}
      </dd>
    </div>
  );
}

function SelectedAppDetail({
  app,
  pending,
  newTracks,
  onManage,
}: {
  app: PlayAppView;
  pending: string | null;
  newTracks: string[];
  onManage: (packageName: string, track: string) => void;
}) {
  const config = detectTestingConfiguration(app.tracks);
  const recommendation = recommendTestingMode(config);
  const testingTracks = app.tracks.filter((track) => track.typeGuess !== "PRODUCTION");
  const production = config.production.tracks[0] || null;
  const closedTracks = config.closedTesting.tracks;

  return (
    <div className="space-y-6">
      <Card>
        <SectionLabel>App overview</SectionLabel>
        <div className="mt-3 flex items-start gap-3">
          <AppMark name={app.name} src={app.iconUrl} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{app.name}</h2>
            <p className="mt-0.5 font-mono text-xs text-muted">{app.packageName}</p>
            <div className="mt-2">
              <Badge tone="good">Google Play · Connected</Badge>
            </div>
          </div>
        </div>
      </Card>

      {newTracks.length > 0 ? (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          New track detected: {newTracks.join(", ")}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Testing configuration"
          description="Detected automatically from Google Play. TestLoop does not ask you which track you use."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DetectedMode
            title="Internal testing"
            exists={config.internalTesting.exists}
            active={config.internalTesting.active}
          />
          <DetectedMode
            title="Closed testing"
            exists={config.closedTesting.exists}
            active={config.closedTesting.active}
            count={closedTracks.length}
          />
          <DetectedMode
            title="Open testing"
            exists={config.openTesting.exists}
            active={config.openTesting.active}
          />
        </div>
        {production ? (
          <div className="mt-4 rounded-control border border-line bg-surface px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Production</div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <PlayStatusMark
                status={playTrackUiStatus({
                  exists: true,
                  releaseStatus: production.releaseStatus,
                })}
              />
              <p className="text-xs text-muted">
                Testing actions never publish to production.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Production · Not configured</p>
        )}
      </Card>

      <RecommendationCard
        app={app}
        recommendation={recommendation}
        pending={pending}
        onManage={onManage}
      />

      {recommendation.primary === "NONE" ? (
        <Card>
          <CardHeader title="No testing track detected" />
          <p className="mt-3 text-sm leading-6 text-body">
            TestLoop could not find an active testing track for this app. Creating a track requires a
            release in Play Console; the Developer API does not create an empty testing track on its
            own.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
              <Button>Create open testing in Play Console</Button>
            </a>
            <a href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
              <Button variant="secondary">Create closed testing</Button>
            </a>
            <a href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
              <Button variant="secondary">Create internal testing</Button>
            </a>
          </div>
        </Card>
      ) : null}

      {closedTracks.length > 0 ? (
        <Card>
          <CardHeader
            title="Closed testing"
            description="Each custom track is listed separately. TestLoop does not merge them."
          />
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {closedTracks.map((track) => (
              <li key={track.track}>
                <TrackManageCard
                  track={track}
                  pending={pending}
                  packageName={app.packageName}
                  onManage={onManage}
                />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-body">{PLAY_TESTER_API_LIMITATION}</p>
        </Card>
      ) : null}

      {testingTracks.length > 0 ? (
        <Card>
          <CardHeader title="Track details" description="Values come from the Play Developer API. Missing fields are not invented." />
          <ul className="mt-4 space-y-3">
            {app.tracks.map((track) => (
              <li key={track.track} className="rounded-control border border-line px-4 py-3">
                <TrackDetails track={track} production={track.typeGuess === "PRODUCTION"} />
                {track.typeGuess !== "PRODUCTION" ? (
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      disabled={pending !== null}
                      onClick={() => onManage(app.packageName, track.track)}
                    >
                      {pending === `manage:${app.packageName}:${track.track}` ? "Opening…" : "Manage"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Production is read-only here. There is no publish action on this page.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function DetectedMode({
  title,
  exists,
  active,
  count,
}: {
  title: string;
  exists: boolean;
  active: boolean;
  count?: number;
}) {
  const status = exists
    ? active
      ? playTrackUiStatus({ exists: true, releaseStatus: "completed" })
      : { kind: "configured" as const, label: "Track configured", symbol: "✓" }
    : playTrackUiStatus({ exists: false, releaseStatus: null });
  return (
    <div className="rounded-control border border-line px-4 py-3">
      <div className="text-sm font-medium text-slate-900">{title}</div>
      <div className="mt-1">
        <PlayStatusMark status={status} />
      </div>
      {count && count > 1 ? <p className="mt-1 text-xs text-muted">{count} tracks</p> : null}
    </div>
  );
}

function RecommendationCard({
  app,
  recommendation,
  pending,
  onManage,
}: {
  app: PlayAppView;
  recommendation: TestingRecommendation;
  pending: string | null;
  onManage: (packageName: string, track: string) => void;
}) {
  if (recommendation.primary === "NONE") return null;
  return (
    <Card>
      <CardHeader
        title={recommendation.ambiguous ? "Recommended for TestLoop" : "Recommended"}
        description={recommendation.ambiguous ? "Multiple testing modes are configured. This is a suggestion, not an automatic change." : undefined}
      />
      <h3 className="mt-4 text-base font-semibold text-slate-900">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-6 text-body">{recommendation.reason}</p>
      {recommendation.track ? (
        <div className="mt-4">
          <Button
            disabled={pending !== null}
            onClick={() => onManage(app.packageName, recommendation.track!)}
          >
            {pending === `manage:${app.packageName}:${recommendation.track}`
              ? "Opening…"
              : recommendation.cta}
          </Button>
        </div>
      ) : null}
      {recommendation.alternatives.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="text-xs font-medium text-muted">Other options</div>
          <ul className="mt-2 space-y-3">
            {recommendation.alternatives.map((item) => (
              <li key={`${item.kind}:${item.track || item.title}`}>
                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                <p className="mt-0.5 text-sm leading-6 text-body">{item.reason}</p>
                {item.track ? (
                  <Button
                    className="mt-2"
                    variant="secondary"
                    disabled={pending !== null}
                    onClick={() => onManage(app.packageName, item.track!)}
                  >
                    Manage {item.title}
                  </Button>
                ) : item.kind === "OPEN" ? (
                  <a className="mt-2 inline-block" href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Set up open testing</Button>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function TrackManageCard({
  track,
  pending,
  packageName,
  onManage,
}: {
  track: PlayTrackRecord;
  pending: string | null;
  packageName: string;
  onManage: (packageName: string, track: string) => void;
}) {
  const status = playTrackUiStatus({ exists: true, releaseStatus: track.releaseStatus });
  return (
    <div className="rounded-control border border-line p-4">
      <div className="font-medium text-slate-900">{track.displayName}</div>
      <div className="mt-1">
        <PlayStatusMark status={status} />
      </div>
      <p className="mt-2 text-sm text-body">
        {track.releaseName || (track.versionCodes[0] ? `Version code ${track.versionCodes[0]}` : PLAY_API_UNAVAILABLE)}
      </p>
      <Button
        className="mt-3"
        variant="secondary"
        disabled={pending !== null}
        onClick={() => onManage(packageName, track.track)}
      >
        {pending === `manage:${packageName}:${track.track}` ? "Opening…" : "Manage"}
      </Button>
    </div>
  );
}

function TrackDetails({ track, production }: { track: PlayTrackRecord; production?: boolean }) {
  const status = playTrackUiStatus({ exists: true, releaseStatus: track.releaseStatus });
  const testerConfig =
    track.googleGroupCount == null
      ? PLAY_API_UNAVAILABLE
      : track.googleGroupCount > 0
        ? `Configured in Google Play (${track.googleGroupCount} group destination${track.googleGroupCount === 1 ? "" : "s"}). Individual email lists are not returned by the API.`
        : "Individual email lists are not returned by the Google Play API.";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">{track.displayName}</div>
          <div className="mt-0.5 font-mono text-xs text-muted">{track.track}</div>
        </div>
        {production ? <Badge tone="warn">Production</Badge> : <PlayStatusMark status={status} />}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Field label="Release status" value={track.releaseStatus} />
        <Field label="Version name" value={track.releaseName} />
        <Field
          label="Version code"
          value={track.versionCodes.length ? track.versionCodes.join(", ") : null}
        />
        <Field
          label="Staged rollout"
          value={track.userFraction == null ? null : `${Math.round(track.userFraction * 100)}%`}
        />
        <Field label="Release notes" value={track.releaseNotes} />
        <Field label="Tester configuration" value={testerConfig} />
      </dl>
      {track.releaseStatus && !["completed", "inProgress"].includes(track.releaseStatus) ? (
        <p className="mt-3 text-sm text-muted">
          Track configured. No active release.
          <a className="ml-2 font-medium text-brand hover:underline" href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
            Configure release in Play Console
          </a>
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || PLAY_API_UNAVAILABLE}</dd>
    </div>
  );
}
