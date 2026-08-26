"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card } from "@/components/ui/card";

type Source = {
  id: string;
  name: string;
  type: string;
  canReadPosts: boolean;
  canMonitorReplies: boolean;
};

export function DiscoveryForm({
  sources,
  campaigns,
  keywords,
}: {
  sources: Source[];
  campaigns: Array<{ id: string; name: string }>;
  keywords: string[];
}) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const custom = String(form.get("keywords") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch("/api/facebook/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: form.get("sourceId"),
        campaignId: form.get("campaignId") || undefined,
        range: form.get("range"),
        keywords: custom.length ? custom : undefined,
        message: form.get("message") || undefined,
        personName: form.get("personName") || undefined,
        postLink: form.get("postLink") || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Search failed");
      return;
    }
    setResult(
      `Scanned ${data.scanned ?? 0}. Created ${data.created ?? data.opportunities?.length ?? 0} opportunities.${
        data.limitation ? ` Limitation: ${data.limitation}` : ""
      }`,
    );
  }

  async function addManualSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/facebook/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        externalId: form.get("externalId"),
        url: form.get("url"),
      }),
    });
    window.location.reload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-6">
        <h2 className="font-medium">Search recent posts</h2>
        <form onSubmit={runSearch} className="mt-4 space-y-4">
          <div>
            <Label>Source</Label>
            <Select name="sourceId" required>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.type})
                </option>
              ))}
            </Select>
            {sources[0] && !sources.find((s) => s.canMonitorReplies) ? (
              <p className="mt-2 text-xs text-amber-200">
                Automatic reply monitoring is unavailable for this Facebook connection.
              </p>
            ) : null}
          </div>
          <div>
            <Label>Campaign</Label>
            <Select name="campaignId">
              <option value="">None</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Time range</Label>
            <Select name="range" defaultValue="1d">
              <option value="1d">Last 24 hours</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
            </Select>
          </div>
          <div>
            <Label>Keywords (one per line)</Label>
            <Textarea name="keywords" defaultValue={keywords.join("\n")} />
          </div>
          <div className="rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-medium">Import a post you are authorized to view</h3>
            <p className="mb-3 text-xs text-slate-400">
              Required for Facebook Groups. Paste the post text; do not scrape private content.
            </p>
            <Label>Post content</Label>
            <Textarea name="message" placeholder="I need Android testers for Google Play closed testing..." />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Person</Label>
                <Input name="personName" />
              </div>
              <div>
                <Label>Post link</Label>
                <Input name="postLink" />
              </div>
            </div>
          </div>
          <Button type="submit">Run discovery</Button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {result ? <p className="mt-3 text-sm text-emerald-300">{result}</p> : null}
      </Card>
      <Card className="p-6">
        <h2 className="font-medium">Add manual group source</h2>
        <p className="mt-1 text-sm text-slate-400">Label only. TestLoop will not log into Facebook as you.</p>
        <form onSubmit={addManualSource} className="mt-4 space-y-3">
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="Android App Testing" required />
          </div>
          <div>
            <Label>Source key</Label>
            <Input name="externalId" placeholder="android-app-testing" required />
          </div>
          <div>
            <Label>URL (optional)</Label>
            <Input name="url" />
          </div>
          <Button type="submit" variant="secondary">
            Save source
          </Button>
        </form>
      </Card>
    </div>
  );
}
