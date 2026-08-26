"use client";

import { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";

export function CreateCampaignForm({
  apps,
  sources,
  groups,
}: {
  apps: Array<{ id: string; name: string; tracks: Array<{ id: string; name: string }> }>;
  sources: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; email: string }>;
}) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        appId: form.get("appId"),
        trackId: form.get("trackId") || undefined,
        sourceId: form.get("sourceId") || undefined,
        googleGroupId: form.get("googleGroupId") || undefined,
        targetTesters: Number(form.get("targetTesters") || 12),
        testingType: form.get("testingType"),
        webOptInUrl: form.get("webOptInUrl") || undefined,
      }),
    });
    window.location.reload();
  }
  return (
    <Card className="p-5">
      <h2 className="font-medium">New campaign</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input name="name" placeholder="NET360 Closed Testing — August 2026" required />
        </div>
        <div>
          <Label>App</Label>
          <Select name="appId" required>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Testing type</Label>
          <Select name="testingType" defaultValue="CLOSED">
            <option value="INTERNAL">Internal</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
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
          <Input name="targetTesters" type="number" defaultValue={12} />
        </div>
        <div>
          <Label>Web opt-in URL</Label>
          <Input name="webOptInUrl" placeholder="https://play.google.com/apps/testing/com.example.app" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Create campaign</Button>
        </div>
      </form>
    </Card>
  );
}
