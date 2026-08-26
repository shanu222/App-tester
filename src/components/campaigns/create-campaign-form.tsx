"use client";

import { FormEvent, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";

type AppOption = {
  id: string;
  name: string;
  packageName: string;
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  testingType: string;
  testerTarget: number;
  tracks: Array<{ id: string; name: string }>;
};

export function CreateCampaignForm({
  apps,
  sources,
  groups,
  initialAppId,
}: {
  apps: AppOption[];
  sources: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; email: string }>;
  initialAppId?: string;
}) {
  const [appId, setAppId] = useState(initialAppId || apps[0]?.id || "");
  const selected = useMemo(() => apps.find((app) => app.id === appId), [apps, appId]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        appId,
        trackId: form.get("trackId") || undefined,
        sourceId: form.get("sourceId") || undefined,
        googleGroupId: form.get("googleGroupId") || undefined,
        targetTesters: Number(form.get("targetTesters") || selected?.testerTarget || 12),
        testingType: form.get("testingType") || selected?.testingType,
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
      setError(data.error || "Could not create campaign");
      return;
    }
    window.location.href = `/campaigns/${data.campaign.id}`;
  }

  return (
    <Card className="p-5">
      <h2 className="font-medium">New campaign</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Select app</Label>
          <Select name="appId" value={appId} onChange={(event) => setAppId(event.target.value)} required>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </Select>
        </div>
        {selected ? (
          <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
            <div className="font-medium">{selected.name}</div>
            <div className="text-slate-400">{selected.packageName}</div>
            <div className="mt-2 break-all text-xs text-sky-300">{selected.playStoreUrl || "No Play Store URL stored"}</div>
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
          <Label>Testing type</Label>
          <Select name="testingType" key={selected?.id} defaultValue={selected?.testingType || "CLOSED"}>
            <option value="INTERNAL">Internal</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
          </Select>
        </div>
        <div>
          <Label>Testing track</Label>
          <Select name="trackId">
            <option value="">None</option>
            {(selected?.tracks || []).map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </Select>
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
          <Label>Google Group</Label>
          <Select name="googleGroupId">
            <option value="">None</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.email}
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
          <Label>Testing / opt-in URL</Label>
          <Input
            name="webOptInUrl"
            key={selected?.id}
            defaultValue={selected?.webOptInUrl || ""}
            placeholder="Leave empty unless a real testing link is configured"
          />
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
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="reciprocalOpen" defaultChecked />
          Reciprocal testing welcome
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="published" defaultChecked />
          Publish testing request
        </label>
        {error ? <p className="md:col-span-2 text-sm text-rose-300">{error}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={!apps.length}>
            Publish testing request
          </Button>
        </div>
      </form>
    </Card>
  );
}
