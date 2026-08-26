"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import { parsePlayStoreUrl } from "@/lib/play-url";

export type AppCardModel = {
  id: string;
  name: string;
  packageName: string;
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  googlePlayStatus: string;
  testingType: string;
  testerTarget: number;
  playConflictNote: string | null;
  syncedFromPlay: boolean;
  campaignStatus: string;
  testersAdded: number;
  optedInTesters: number;
  testingActivity: number;
  tracks: Array<{ id: string; name: string; testingType: string }>;
  campaign: { id: string; name: string; status: string } | null;
};

type PlayNewApp = {
  name: string;
  packageName: string;
  playStoreUrl: string;
  label?: string;
};

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PRODUCTION", label: "Production" },
  { id: "CLOSED_TESTING", label: "Closed Testing" },
  { id: "INTERNAL_TESTING", label: "Internal Testing" },
  { id: "OPEN_TESTING", label: "Open Testing" },
  { id: "CAMPAIGN_ACTIVE", label: "Campaign Active" },
  { id: "CAMPAIGN_INACTIVE", label: "Campaign Inactive" },
];

function statusTone(status: string): "good" | "accent" | "warn" | "neutral" {
  if (status === "PRODUCTION") return "good";
  if (status === "CLOSED_TESTING") return "accent";
  if (status === "PRODUCTION_REVIEW" || status === "OPEN_TESTING") return "warn";
  return "neutral";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function MyAppsWorkspace({ apps }: { apps: AppCardModel[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [newPlayApps, setNewPlayApps] = useState<PlayNewApp[]>([]);
  const [syncing, setSyncing] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (q && !app.name.toLowerCase().includes(q) && !app.packageName.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === "CAMPAIGN_ACTIVE") return app.campaignStatus === "ACTIVE";
      if (filter === "CAMPAIGN_INACTIVE") return app.campaignStatus !== "ACTIVE";
      if (filter !== "ALL") return app.googlePlayStatus === filter;
      return true;
    });
  }, [apps, query, filter]);

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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const packageName = String(form.get("packageName") || "").trim();
    const googlePlayUrl = String(form.get("googlePlayUrl") || "").trim();
    const parsed = parsePlayStoreUrl(googlePlayUrl);
    if (parsed && parsed.packageName !== packageName) {
      setError("Package name does not match the Google Play URL.");
      return;
    }
    const response = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        packageName,
        googlePlayUrl,
        testingUrl: form.get("testingUrl") || undefined,
        testingType: form.get("testingType"),
        testingTrack: form.get("testingTrack") || undefined,
        iconUrl: form.get("iconUrl") || undefined,
        testerTarget: Number(form.get("testerTarget") || 12),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not save app");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            Store listing URLs and closed-testing opt-in URLs are stored separately. Tester counts come from recorded
            TestLoop activity, not invented Play Console numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={syncPlay} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync Google Play Apps"}
          </Button>
          <Button type="button" onClick={() => setShowForm((open) => !open)}>
            + Add App
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by app or package name"
          className="max-w-sm"
        />
        <Select value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-xs">
          {FILTERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {syncMessage ? <p className="text-sm text-emerald-300">{syncMessage}</p> : null}

      {newPlayApps.length > 0 ? (
        <Card className="space-y-3 p-5">
          <h2 className="font-medium">New apps available in Google Play</h2>
          {newPlayApps.map((app) => (
            <div key={app.packageName} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3">
              <div>
                <div className="font-medium">{app.name}</div>
                <div className="text-xs text-slate-400">{app.packageName}</div>
              </div>
              <Button type="button" variant="secondary" onClick={() => importPlayApp(app.packageName)} disabled={syncing}>
                Add to My Apps
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      {showForm ? (
        <Card className="p-5">
          <h2 className="font-medium">Add Android app</h2>
          <form onSubmit={onCreate} className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <Label>App name</Label>
              <Input name="name" placeholder="My New App" required />
            </div>
            <div>
              <Label>Package name</Label>
              <Input name="packageName" placeholder="com.example.myapp" required />
            </div>
            <div className="md:col-span-2">
              <Label>Google Play URL</Label>
              <Input name="googlePlayUrl" placeholder="https://play.google.com/store/apps/details?id=com.example.myapp" required />
            </div>
            <div>
              <Label>App icon URL</Label>
              <Input name="iconUrl" placeholder="https://…" />
            </div>
            <div>
              <Label>Testing type</Label>
              <Select name="testingType" defaultValue="CLOSED">
                <option value="INTERNAL">Internal testing</option>
                <option value="CLOSED">Closed testing</option>
                <option value="OPEN">Open testing</option>
              </Select>
            </div>
            <div>
              <Label>Testing track</Label>
              <Input name="testingTrack" placeholder="Closed testing" />
            </div>
            <div>
              <Label>Testing / opt-in link</Label>
              <Input name="testingUrl" placeholder="Leave empty unless you have a real opt-in URL" />
            </div>
            <div>
              <Label>Campaign target</Label>
              <Input name="testerTarget" type="number" defaultValue={12} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Save App</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {apps.length === 0 && !showForm ? (
        <EmptyState
          title="No apps yet"
          body="Add your first Android app to publish a testing request and connect Google Play tracks."
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              Add an app
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No apps match this search" body="Try a different name, package, or filter." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((app) => {
            const target = app.testerTarget || 12;
            const progress = Math.min(100, Math.round((app.optedInTesters / target) * 100));
            const manageHref = app.campaign ? `/campaigns/${app.campaign.id}` : `/campaigns?appId=${app.id}`;
            const showManage =
              app.googlePlayStatus === "CLOSED_TESTING" ||
              app.googlePlayStatus === "INTERNAL_TESTING" ||
              app.googlePlayStatus === "OPEN_TESTING" ||
              Boolean(app.campaign);
            return (
              <Card key={app.id} className="p-5">
                <div className="flex gap-4">
                  {app.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.iconUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 text-sm font-semibold text-emerald-200">
                      {initials(app.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/apps/${app.id}`} className="truncate text-lg font-semibold">
                        {app.name}
                      </Link>
                      <Badge tone={statusTone(app.googlePlayStatus)}>{statusLabel(app.googlePlayStatus)}</Badge>
                      {app.campaign ? (
                        <Badge tone={app.campaign.status === "ACTIVE" ? "good" : "neutral"}>{app.campaign.status}</Badge>
                      ) : (
                        <Badge>No campaign</Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-400">{app.packageName}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {app.tracks[0]?.name || app.testingType} · {app.campaign?.name || "No testing campaign yet"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>
                      {app.optedInTesters} / {target} testers opted in
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.max(progress, 4)}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                    <div>
                      <div className="text-base font-semibold text-slate-100">{app.testersAdded}</div>
                      Added
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-100">{app.optedInTesters}</div>
                      Opted in
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-100">{app.testingActivity}</div>
                      Testing activity
                    </div>
                  </div>
                </div>

                {app.playConflictNote ? (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {app.playConflictNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {app.playStoreUrl ? (
                    <a
                      href={app.playStoreUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-medium text-slate-950"
                    >
                      Open Google Play
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">No Play Store URL stored</span>
                  )}
                  {showManage ? (
                    <Link
                      href={manageHref}
                      className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm"
                    >
                      Manage Testing
                    </Link>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
