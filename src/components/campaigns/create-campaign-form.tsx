"use client";

import { FormEvent, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import Link from "next/link";

type TrackOption = {
  id: string;
  name: string;
  /** Real Play Console track name, e.g. "internal". */
  playTrack: string;
  testingType: string;
  syncedFromPlay: boolean;
};

type AppOption = {
  id: string;
  name: string;
  packageName: string;
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  testingType: string;
  testerTarget: number;
  tracks: TrackOption[];
};

export function CreateCampaignForm({
  apps,
  sources,
  initialAppId,
}: {
  apps: AppOption[];
  sources: Array<{ id: string; name: string }>;
  initialAppId?: string;
}) {
  const [appId, setAppId] = useState(initialAppId || apps[0]?.id || "");
  const selected = useMemo(() => apps.find((app) => app.id === appId), [apps, appId]);
  const [trackId, setTrackId] = useState("");
  const [manualType, setManualType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const track = useMemo(
    () => selected?.tracks.find((item) => item.id === trackId),
    [selected, trackId],
  );
  // A chosen track is the source of truth for the testing type: the campaign
  // must describe the same kind of testing Play Console is actually running.
  const testingType = track?.testingType || manualType || selected?.testingType || "CLOSED";

  function chooseApp(nextAppId: string) {
    setAppId(nextAppId);
    setTrackId("");
    setManualType("");
  }
  const optIn = useMemo(() => {
    if (!selected) return { url: null as string | null, needsManual: false };
    if (selected.webOptInUrl) return { url: selected.webOptInUrl, needsManual: false };
    if (testingType === "INTERNAL") return { url: null, needsManual: true };
    return {
      url: `https://play.google.com/apps/testing/${selected.packageName}`,
      needsManual: false,
    };
  }, [selected, testingType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          appId,
          trackId: trackId || undefined,
          playTrack: track?.playTrack || undefined,
          sourceId: form.get("sourceId") || undefined,
          targetTesters: Number(form.get("targetTesters") || selected?.testerTarget || 12),
          testingType,
          playStoreUrl: selected?.playStoreUrl || undefined,
          webOptInUrl: form.get("webOptInUrl") || selected?.webOptInUrl || undefined,
          durationDays: Number(form.get("durationDays") || 14),
          description: form.get("description") || undefined,
          testingInstructions: form.get("testingInstructions") || undefined,
          reciprocalOpen: form.get("reciprocalOpen") === "on",
          published: form.get("published") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not create campaign");
      }
      window.location.href = `/campaigns/${data.campaign.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create campaign");
      setPending(false);
    }
  }

  if (!apps.length) {
    return (
      <EmptyState
        title="Add an app first"
        body="Create an Android app before publishing a testing request."
        action={
          <Link href="/apps">
            <Button>Go to My Apps</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="New testing request"
        description="Set a real tester target and duration. Leave the opt-in URL empty unless one exists."
      />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Select app</Label>
          <Select name="appId" value={appId} onChange={(event) => chooseApp(event.target.value)} required>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </Select>
        </div>
        {selected ? (
          <div className="md:col-span-2 rounded-card border border-line bg-surface p-4 text-sm text-slate-600">
            <div className="font-medium">{selected.name}</div>
            <div className="text-muted">{selected.packageName}</div>
            <div className="mt-2 break-all text-xs text-brand">{selected.playStoreUrl || "No Play Store URL stored"}</div>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input
            name="name"
            key={selected?.id}
            defaultValue={selected ? `${selected.name} — Closed Testing` : ""}
            required
          />
        </div>
        <div>
          <Label>Testing track</Label>
          <Select value={trackId} onChange={(event) => setTrackId(event.target.value)}>
            <option value="">No specific track</option>
            {(selected?.tracks || []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.syncedFromPlay ? " · from Play Console" : ""}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {selected?.tracks.length
              ? "Tracks marked “from Play Console” were read from the Play Developer API."
              : "No tracks yet. Connect Google Play and refresh the app to read its real tracks."}
          </p>
        </div>
        <div>
          <Label>Testing type</Label>
          {track ? (
            <div className="flex h-10 items-center rounded-control border border-line bg-surface px-3 text-sm text-body">
              {testingType.charAt(0) + testingType.slice(1).toLowerCase()} · set by the selected track
            </div>
          ) : (
            <Select value={testingType} onChange={(event) => setManualType(event.target.value)}>
              <option value="INTERNAL">Internal</option>
              <option value="CLOSED">Closed</option>
              <option value="OPEN">Open</option>
            </Select>
          )}
        </div>
        <div>
          <Label>Source</Label>
          <Select name="sourceId">
            <option value="">None</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Target testers</Label>
          <Input
            name="targetTesters"
            type="number"
            key={selected?.id}
            defaultValue={selected?.testerTarget || 12}
          />
        </div>
        <div>
          <Label>Google Play opt-in URL</Label>
          <Input
            name="webOptInUrl"
            key={`${selected?.id}-${testingType}`}
            defaultValue={selected?.webOptInUrl || ""}
            placeholder={optIn.needsManual ? "https://play.google.com/apps/internaltest/…" : "Leave empty to use Google's opt-in page"}
          />
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {optIn.needsManual ? (
              <>
                Internal testing links are issued by Play Console and are not returned by the Play
                Developer API. Copy yours from <strong>Internal testing → Testers</strong>.
              </>
            ) : optIn.url ? (
              <>
                Testers will be sent to <span className="break-all text-body">{optIn.url}</span>
              </>
            ) : (
              "Add a package name to the app to build the opt-in URL."
            )}
          </p>
        </div>
        <div>
          <Label>Testing duration (days)</Label>
          <Input name="durationDays" type="number" min={1} max={90} defaultValue={14} />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Input name="description" placeholder="We are looking for Android developers to help test this app." />
        </div>
        <div className="md:col-span-2">
          <Label>Testing instructions</Label>
          <Input name="testingInstructions" placeholder="Install the app and use it regularly." />
        </div>
        <Checkbox name="reciprocalOpen" defaultChecked label="Reciprocal testing welcome" />
        <Checkbox name="published" defaultChecked label="Publish testing request" />
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 md:col-span-2"
          >
            {error}
          </p>
        ) : null}
        <div className="md:col-span-2">
          <Button type="submit" aria-busy={pending} disabled={pending}>
            {pending ? "Publishing…" : "Publish testing request"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
