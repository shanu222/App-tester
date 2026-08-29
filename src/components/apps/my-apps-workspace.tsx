"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { AppMark } from "@/components/brand/app-mark";
import { AddAppWizard, type PlayAppOption } from "@/components/apps/add-app-wizard";
import { RemoveAppButton } from "@/components/apps/remove-app-button";
import { connectionLabel } from "@/lib/manual-app";
import { Plus, RefreshCw, Search } from "lucide-react";

export type AppCardModel = {
  id: string;
  name: string;
  packageName: string | null;
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  googlePlayStatus: string;
  testingType: string;
  testingTypes: string[];
  testerTarget: number;
  playConflictNote: string | null;
  syncedFromPlay: boolean;
  campaignStatus: string;
  testersAdded: number;
  testersRegistered: number;
  testingActivity: number;
  tracks: Array<{ id: string; name: string; testingType: string }>;
  campaign: { id: string; name: string; status: string; published: boolean } | null;
};

type PlayNewApp = {
  name: string;
  packageName: string;
  playStoreUrl: string;
  label?: string;
};

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "MANUAL", label: "Manual" },
  { id: "PLAY", label: "Google Play" },
  { id: "CLOSED", label: "Closed" },
  { id: "INTERNAL", label: "Internal" },
  { id: "OPEN", label: "Open" },
  { id: "CAMPAIGN_ACTIVE", label: "Active request" },
];

export function MyAppsWorkspace({
  apps,
  playApps,
  playConnected,
  lastSyncAt,
}: {
  apps: AppCardModel[];
  playApps: PlayAppOption[];
  playConnected: boolean;
  lastSyncAt?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [newPlayApps, setNewPlayApps] = useState<PlayNewApp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [listedApps, setListedApps] = useState(apps);

  useEffect(() => {
    setListedApps(apps);
  }, [apps]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listedApps.filter((app) => {
      if (q && !app.name.toLowerCase().includes(q)) return false;
      if (filter === "CAMPAIGN_ACTIVE") return app.campaignStatus === "ACTIVE";
      if (filter === "MANUAL") return !app.syncedFromPlay;
      if (filter === "PLAY") return app.syncedFromPlay;
      if (filter === "CLOSED" || filter === "INTERNAL" || filter === "OPEN") {
        return app.testingTypes.includes(filter) || app.testingType === filter;
      }
      return true;
    });
  }, [listedApps, query, filter]);

  async function syncPlay() {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/google/play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed");
      setNewPlayApps(data.newApps || []);
      setSyncMessage(data.message || "Synced.");
      if (!(data.newApps || []).length) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function importPlayApp(packageName: string) {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/google/play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addPackageNames: [packageName] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add app");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add app");
      setSyncing(false);
    }
  }

  const wizardApps: PlayAppOption[] = [
    ...playApps,
    ...listedApps
      .filter((app) => !app.syncedFromPlay)
      .map((app) => ({
        id: app.id,
        name: app.name,
        packageName: app.packageName,
        source: "manual" as const,
        testingType: (app.testingType === "OPEN" || app.testingType === "INTERNAL" ? app.testingType : "CLOSED") as
          | "INTERNAL"
          | "CLOSED"
          | "OPEN",
        playStoreUrl: app.playStoreUrl,
        webOptInUrl: app.webOptInUrl,
        iconUrl: app.iconUrl,
        testerTarget: app.testerTarget,
        lastSyncAt: null,
        playTracks: [],
        testingTracks: [],
      })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-end gap-2">
        <Button type="button" variant="secondary" aria-busy={syncing} onClick={syncPlay} disabled={syncing}>
          <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
          {syncing ? "Syncing…" : "Sync Google Play"}
        </Button>
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Add app
        </Button>
      </div>

      {showForm ? (
        <AddAppWizard
          apps={wizardApps}
          sources={[]}
          playConnected={playConnected}
          lastSyncAt={lastSyncAt}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <label htmlFor="apps-search" className="sr-only">
            Search apps
          </label>
          <Input
            id="apps-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps"
            className="pl-9"
          />
        </div>
        <label htmlFor="apps-filter" className="sr-only">
          Filter apps
        </label>
        <Select id="apps-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full max-w-xs">
          {FILTERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          {error}
        </p>
      ) : null}
      {syncMessage ? (
        <p className="rounded-control border border-blue-200 bg-brand-soft px-3 py-2 text-sm leading-5 text-blue-700">
          {syncMessage}
        </p>
      ) : null}

      {newPlayApps.length > 0 ? (
        <Card>
          <p className="text-[15px] font-semibold text-slate-900">New apps in Google Play</p>
          <div className="mt-4 space-y-2.5">
            {newPlayApps.map((app) => (
              <div
                key={app.packageName}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 py-3"
              >
                <div className="truncate font-medium text-slate-900">{app.name}</div>
                <Button type="button" variant="secondary" onClick={() => importPlayApp(app.packageName)} disabled={syncing}>
                  Add to My Apps
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {listedApps.length === 0 && !showForm ? (
        <EmptyState
          title="No apps yet"
          body="Add an app from Google Play, or publish a manual testing request."
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              Add an app
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No apps match this search" body="Try a different name or filter." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((app) => {
            const types = app.testingTypes.length ? app.testingTypes : [app.testingType];
            const livePublished = Boolean(app.campaign?.published && app.campaign.status === "ACTIVE");
            const manageHref = livePublished && app.campaign
              ? `/campaigns/${app.campaign.id}`
              : `/campaigns?appId=${app.id}`;
            return (
              <Card key={app.id} className="flex flex-col">
                <div className="flex gap-4">
                  <AppMark src={app.iconUrl} name={app.name} size={56} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/apps/${app.id}`} className="truncate text-base font-semibold text-slate-900 hover:text-brand">
                      {app.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {types.map((type) => (
                        <TestingTypeBadge key={type} type={type} />
                      ))}
                      <Badge tone={app.syncedFromPlay ? "good" : "neutral"}>{connectionLabel(app.syncedFromPlay)}</Badge>
                    </div>
                    {app.campaign ? (
                      <p className="mt-2 truncate text-sm text-muted">{app.campaign.name}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted">No testing request yet</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {app.playStoreUrl ? (
                    <a
                      href={app.playStoreUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9.5 items-center rounded-control bg-brand px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-hover"
                    >
                      Open Google Play
                    </a>
                  ) : null}
                  <Link
                    href={manageHref}
                    className="inline-flex h-9.5 items-center rounded-control border border-line-strong bg-white px-4 text-sm font-medium text-slate-700 shadow-card transition-colors hover:bg-surface hover:text-slate-900"
                  >
                    {livePublished ? "Manage testing" : "Publish testing"}
                  </Link>
                  <RemoveAppButton
                    appId={app.id}
                    onRemoved={() => setListedApps((current) => current.filter((item) => item.id !== app.id))}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
