"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
  trackHasDetectedConfiguration,
} from "@/lib/integrations/play-config";
import { formatPlayTimestamp } from "@/components/play/play-connection-panel";
import { SourceBadge } from "@/components/ui/source-badge";
import { PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";
import { fetchPlayJson } from "@/lib/integrations/play-client-fetch";

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
  testloop?: {
    testers: number;
    pendingPlayAction: number;
  };
};

type Filter = "all" | "testing" | "none" | "open" | "closed" | "internal" | "production";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "testing", label: "Testing configured" },
  { id: "none", label: "No testing configured" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "internal", label: "Internal" },
  { id: "production", label: "Production" },
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
      if (filter === "testing" && (app.configuration.configuredTrackCount ?? app.configuration.testingTrackCount) === 0)
        return false;
      if (filter === "none" && (app.configuration.configuredTrackCount ?? app.configuration.testingTrackCount) > 0)
        return false;
      if (filter === "open" && !app.configuration.open) return false;
      if (filter === "closed" && !app.configuration.closed) return false;
      if (filter === "internal" && !app.configuration.internal) return false;
      if (filter === "production" && !app.configuration.production) return false;
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
      const { response, data } = await fetchPlayJson("/api/google-play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!response.ok) {
        setError((typeof data.error === "string" && data.error) || `Could not refresh Google Play (HTTP ${response.status}).`);
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
        const { response: selectResponse, data: selectData } = await fetchPlayJson("/api/google-play/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "select", packageName: app.packageName }),
        });
        if (!selectResponse.ok) {
          setError((typeof selectData.error === "string" && selectData.error) || "This app could not be selected.");
          return;
        }
      } else {
        const { response: syncResponse, data: syncData } = await fetchPlayJson("/api/google-play/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync", packageName: app.packageName }),
        });
        if (!syncResponse.ok) {
          setError((typeof syncData.error === "string" && syncData.error) || "Could not read tracks for this app.");
          return;
        }
        const discovery = syncData.discovery as { newTracks?: unknown } | undefined;
        if (Array.isArray(discovery?.newTracks)) {
          setNewTracks(discovery.newTracks.filter((item): item is string => typeof item === "string"));
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
      const { response, data } = await fetchPlayJson("/api/google-play/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName, track }),
      });
      if (!response.ok) {
        setError((typeof data.error === "string" && data.error) || "Could not open that testing campaign.");
        return;
      }
      const campaignId = typeof data.campaignId === "string" ? data.campaignId : "";
      if (!campaignId) {
        setError("Could not open that testing campaign.");
        return;
      }
      window.location.href = `/campaigns/${campaignId}`;
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Your Google Play apps"
          description="Connected to Google Play."
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
              body="Refresh from Google Play to load the applications this account can access."
              action={
                <Button variant="secondary" onClick={refresh} disabled={pending !== null}>
                  {pending === "refresh" ? "Refreshing…" : "Refresh from Google Play"}
                </Button>
              }
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
          onSync={() => loadApp(selected)}
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
  const synced = Boolean(app.lastSyncAt);
  return (
    <div
      className={
        selected
          ? "rounded-card border border-brand bg-white p-5"
          : "rounded-card border border-line bg-white p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <AppMark name={app.name} src={app.iconUrl} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-slate-900">{app.name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="good">Google Play connected</Badge>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-brand">App details</summary>
              <p className="mt-1 break-all text-xs text-muted">{app.packageName}</p>
              <p className="mt-1 text-xs text-muted">
                Last synchronized: {formatPlayTimestamp(app.lastSyncAt) || "Not yet synchronized"}
              </p>
            </details>
          </div>
        </div>
        <Button variant={selected ? "secondary" : "primary"} onClick={onSelect} disabled={pending !== null}>
          {pending === `sync:${app.packageName}`
            ? "Loading…"
            : app.selected
              ? "Manage testing"
              : "Add to TestLoop"}
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <ModeChip
          label="Internal"
          exists={config.internal}
          active={config.internalActive}
          configured={config.internalConfigured}
          synced={synced}
        />
        <ModeChip
          label="Closed"
          exists={config.closed}
          active={config.closedActive}
          configured={config.closedConfigured}
          synced={synced}
          extra={config.closedCount > 1 ? `${config.closedCount} tracks` : null}
        />
        <ModeChip
          label="Open"
          exists={config.open}
          active={config.openActive}
          configured={config.openConfigured}
          synced={synced}
        />
        <ModeChip
          label="Production"
          exists={config.production}
          active={config.productionActive}
          configured={config.productionConfigured}
          synced={synced}
        />
      </dl>
    </div>
  );
}

function ModeChip({
  label,
  exists,
  active,
  configured,
  synced,
  extra,
}: {
  label: string;
  exists: boolean;
  active: boolean;
  configured?: boolean;
  synced: boolean;
  extra?: string | null;
}) {
  const status = playTrackUiStatus({
    exists,
    releaseStatus: active ? "completed" : null,
    detected: Boolean(configured),
    unsynced: !synced,
  });
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5">
        <PlayStatusMark status={status} />
        {extra ? <span className="ml-1.5 text-xs text-muted">{extra}</span> : null}
      </dd>
    </div>
  );
}

function SelectedAppDetail({
  app,
  pending,
  newTracks,
  onManage,
  onSync,
}: {
  app: PlayAppView;
  pending: string | null;
  newTracks: string[];
  onManage: (packageName: string, track: string) => void;
  onSync: () => void;
}) {
  const config = detectTestingConfiguration(app.tracks);
  const recommendation = recommendTestingMode(config);
  const production = config.production.tracks[0] || null;
  const closedTracks = config.closedTesting.tracks;
  const synced = Boolean(app.lastSyncAt);
  const testers = app.testloop || { testers: 0, pendingPlayAction: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <SectionLabel>App overview</SectionLabel>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AppMark name={app.name} src={app.iconUrl} />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">{app.name}</h2>
              <details className="mt-1">
                <summary className="cursor-pointer text-sm font-medium text-brand">App details</summary>
                <p className="mt-1 break-all text-xs text-muted">{app.packageName}</p>
              </details>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <SourceBadge source="google-play" />
                <Badge tone="good">Connected</Badge>
                {app.selected ? (
                  <>
                    <SourceBadge source="testloop" />
                    <span className="text-xs text-muted">App connected to TestLoop</span>
                  </>
                ) : null}
              </div>
              {app.selected ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Google Play remains the source of truth.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                Last synchronized: {formatPlayTimestamp(app.lastSyncAt) || "Not yet synchronized"}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onSync} disabled={pending !== null}>
            {pending === `sync:${app.packageName}` ? "Refreshing…" : "Refresh from Google Play"}
          </Button>
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
          description="Detected automatically from Google Play."
          action={<SourceBadge source="google-play" />}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetectedMode
            title="Internal testing"
            exists={config.internalTesting.exists}
            active={config.internalTesting.active}
            synced={synced}
            tracks={config.internalTesting.tracks}
          />
          <DetectedMode
            title="Closed testing"
            exists={config.closedTesting.exists}
            active={config.closedTesting.active}
            synced={synced}
            tracks={closedTracks}
          />
          <DetectedMode
            title="Open testing"
            exists={config.openTesting.exists}
            active={config.openTesting.active}
            synced={synced}
            tracks={config.openTesting.tracks}
          />
          <div className="rounded-control border border-line bg-surface px-4 py-3">
            <div className="text-sm font-medium text-slate-900">Production</div>
            <div className="mt-1">
              <PlayStatusMark
                status={playTrackUiStatus({
                  exists: config.production.exists,
                  releaseStatus: production?.releaseStatus,
                  detected: production ? trackHasDetectedConfiguration(production) : false,
                  unsynced: !synced,
                })}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              TestLoop does not publish to production or modify production releases.
            </p>
          </div>
        </div>
      </Card>

      <RecommendationCard
        app={app}
        recommendation={recommendation}
        pending={pending}
        onManage={onManage}
      />

      {recommendation.primary === "NONE" ? (
        <Card>
          <CardHeader title="No active testing configuration detected" />
          <p className="mt-3 text-sm leading-6 text-body">
            Configure testing in Google Play Console first. TestLoop will not create tracks, upload
            bundles, or change Play Console configuration.
          </p>
          <a className="mt-4 inline-flex" href={playConsoleSetupUrl()} target="_blank" rel="noreferrer">
            <Button variant="secondary">Open Play Console</Button>
          </a>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Tester activity" action={<SourceBadge source="testloop" />} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted">TestLoop testers</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{testers.testers}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Pending Play Console action</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {testers.pendingPlayAction}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-body">
          Individual Google Play tester lists, opt-in status, and per-tester installs are not
          available through the connected Play Developer API.
        </p>
        <SourceBadge source="limitation" className="mt-2" />
      </Card>

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

      {app.tracks.length > 0 ? (
        <Card>
          <CardHeader
            title="Track details"
            description="Values come from the Play Developer API. Missing fields are not invented."
            action={<SourceBadge source="google-play" />}
          />
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
                      {pending === `manage:${app.packageName}:${track.track}`
                        ? "Opening…"
                        : app.selected
                          ? "Manage"
                          : "Add to TestLoop"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Production is read-only. TestLoop does not publish to production.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Sync information" />
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted">Last synchronized</dt>
            <dd className="mt-1 text-slate-800">
              {formatPlayTimestamp(app.lastSyncAt) || "Not yet synchronized"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">API status</dt>
            <dd className="mt-1 text-slate-800">{synced ? "Google Play synced" : "Waiting for Google Play"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Limitations</dt>
            <dd className="mt-1 text-slate-800">
              Individual testers, opt-in, and per-tester installs are not returned by the connected API.
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function DetectedMode({
  title,
  exists,
  active,
  synced,
  tracks,
}: {
  title: string;
  exists: boolean;
  active: boolean;
  synced: boolean;
  tracks: PlayTrackRecord[];
}) {
  const status = playTrackUiStatus({
    exists,
    releaseStatus: active ? "completed" : null,
    detected: tracks.some(trackHasDetectedConfiguration),
    unsynced: !synced,
  });
  return (
    <div className="rounded-control border border-line px-4 py-3">
      <div className="text-sm font-medium text-slate-900">{title}</div>
      <div className="mt-1">
        <PlayStatusMark status={status} />
      </div>
      {tracks.length > 0 ? (
        <p className="mt-1 text-xs text-muted">
          {tracks.length} track{tracks.length === 1 ? "" : "s"}
          {tracks.length > 1 ? ` · ${tracks.map((track) => track.displayName).join(", ")}` : ""}
        </p>
      ) : null}
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
          title="Recommended for TestLoop"
          description={
            recommendation.ambiguous
              ? "Multiple testing modes detected. This is a suggestion, not an automatic change."
              : "TestLoop will not change your Play Console tracks."
          }
          action={<SourceBadge source="calculated" />}
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
  const status = playTrackUiStatus({
    exists: true,
    releaseStatus: track.releaseStatus,
    detected: trackHasDetectedConfiguration(track),
  });
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
  const status = playTrackUiStatus({
    exists: true,
    releaseStatus: track.releaseStatus,
    detected: trackHasDetectedConfiguration(track),
  });
  const testerConfig =
    track.googleGroupCount == null
      ? "Google Group status unavailable"
      : track.googleGroupCount > 0
        ? "Google Group testing available"
        : "Individual tester access";

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
        {track.googleGroups?.length ? (
          <Field label="Google Group email" value={track.googleGroups.join(", ")} />
        ) : null}
        <Field
          label="Downloads"
          value="Individual tester download identity is not available through the current Google Play API."
        />
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
