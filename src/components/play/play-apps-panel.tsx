"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import { AppMark } from "@/components/brand/app-mark";

export type PlayAppView = {
  id: string;
  packageName: string;
  name: string;
  iconUrl: string | null;
  selected: boolean;
  appId: string | null;
};

type Track = {
  track: string;
  typeGuess: "INTERNAL" | "CLOSED" | "OPEN" | "PRODUCTION";
  releaseName: string | null;
  versionCodes: string[];
  releaseStatus: string | null;
  accessMode: "AUTOMATIC" | "MANUAL_EMAIL_LIST";
};

type Filter = "all" | "selected" | "available";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "selected", label: "Managed" },
  { id: "available", label: "Not managed" },
];

export function PlayAppsPanel({ apps }: { apps: PlayAppView[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Record<string, Track[]>>({});
  const [trackError, setTrackError] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (filter === "selected" && !app.selected) return false;
      if (filter === "available" && app.selected) return false;
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
        setError(data?.error || `Could not list apps (HTTP ${response.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach TestLoop. Check your network and retry.");
    } finally {
      setPending(null);
    }
  }

  async function select(packageName: string) {
    setPending(packageName);
    setError(null);
    try {
      const response = await fetch("/api/google-play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", packageName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || `Could not select that app (HTTP ${response.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach TestLoop. Check your network and retry.");
    } finally {
      setPending(null);
    }
  }

  async function loadTracks(packageName: string) {
    setPending(`tracks:${packageName}`);
    setTrackError((prev) => ({ ...prev, [packageName]: "" }));
    try {
      const response = await fetch("/api/google-play/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setTrackError((prev) => ({
          ...prev,
          [packageName]: data?.error || `Could not read tracks (HTTP ${response.status}).`,
        }));
        return;
      }
      setTracks((prev) => ({ ...prev, [packageName]: data.tracks as Track[] }));
    } catch {
      setTrackError((prev) => ({
        ...prev,
        [packageName]: "Could not reach TestLoop. Check your network and retry.",
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="My Google Play apps"
        description="Applications Google reports for this connection. Play Console remains the source of truth."
        action={
          <Button variant="secondary" onClick={refresh} disabled={pending !== null}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            {pending === "refresh" ? "Refreshing…" : "Refresh apps"}
          </Button>
        }
      />

      {error ? (
        <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          {error}
        </p>
      ) : null}

      {apps.length === 0 ? (
        <div className="mt-5 border-t border-line pt-5">
          <EmptyState
            title="No apps discovered yet"
            body="Refresh apps to ask Google which applications this connection can access. App discovery uses the Play Developer Reporting API, which must be enabled in the same Google Cloud project."
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
                placeholder="Search by name or package"
                aria-label="Search apps"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5">
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
            <ul className="mt-4 space-y-3">
              {visible.map((app) => (
                <li
                  key={app.id}
                  className="rounded-control border border-line bg-white p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <AppMark name={app.name} src={app.iconUrl} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{app.name}</div>
                        <div className="mt-0.5 truncate font-mono text-xs text-muted">
                          {app.packageName}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge tone={app.selected ? "good" : "neutral"}>
                        {app.selected ? "Managed" : "Not managed"}
                      </Badge>
                      {app.selected ? (
                        <Button
                          variant="secondary"
                          onClick={() => loadTracks(app.packageName)}
                          disabled={pending !== null}
                        >
                          {pending === `tracks:${app.packageName}` ? "Loading…" : "Manage testing"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => select(app.packageName)}
                          disabled={pending !== null}
                        >
                          {pending === app.packageName ? "Selecting…" : "Select app"}
                        </Button>
                      )}
                      {app.appId ? (
                        <Link
                          href={`/campaigns?appId=${app.appId}`}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          Create campaign
                        </Link>
                      ) : null}
                      {app.appId ? (
                        <Link
                          href={`/apps/${app.appId}`}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {trackError[app.packageName] ? (
                    <p className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                      {trackError[app.packageName]}
                    </p>
                  ) : null}

                  {tracks[app.packageName] ? (
                    <TrackList tracks={tracks[app.packageName]} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function TrackList({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
        Google returned no tracks for this app.
      </p>
    );
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="text-xs font-medium text-muted">Testing tracks reported by Google Play</div>
      <ul className="mt-2 space-y-2">
        {tracks.map((track) => (
          <li
            key={track.track}
            className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <span className="font-mono text-sm text-slate-900">{track.track}</span>
              <span className="ml-2 text-xs text-muted">
                {track.releaseName ? `release ${track.releaseName}` : "no release"}
                {track.releaseStatus ? ` · ${track.releaseStatus}` : ""}
                {track.versionCodes.length > 0 ? ` · v${track.versionCodes.join(", ")}` : ""}
              </span>
            </div>
            <Badge tone={track.accessMode === "AUTOMATIC" ? "good" : "warn"}>
              {track.accessMode === "AUTOMATIC" ? "Testers automatic" : "Testers need Play Console"}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
