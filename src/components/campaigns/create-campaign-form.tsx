"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/widgets";
import { SourceBadge } from "@/components/ui/source-badge";
import { PlayStatusMark } from "@/components/play/play-status";
import { formatPlayTimestamp } from "@/components/play/play-connection-panel";
import type { PlayTrackRecord } from "@/lib/integrations/types";
import {
  detectTestingConfiguration,
  playTrackFingerprint,
  playTrackUiStatus,
  preferDetectedTrack,
  summarizeConfiguration,
} from "@/lib/integrations/play-config";
import { campaignTestingUrl } from "@/lib/integrations/play-testers";
import {
  defaultDurationDays,
  defaultRequestDescription,
  defaultRequestName,
  defaultTargetTesters,
  defaultTestingInstructions,
  testingTypeExplanation,
  testingTypeLabel,
} from "@/lib/campaign-autofill";

export type PlayAppOption = {
  id: string;
  name: string;
  packageName: string;
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  testerTarget: number;
  lastSyncAt: string | null;
  playTracks: PlayTrackRecord[];
  testingTracks: Array<{ id: string; playTrack: string }>;
};

export function CreateCampaignForm({
  apps,
  sources,
  initialAppId,
  playConnected,
  lastSyncAt,
}: {
  apps: PlayAppOption[];
  sources: Array<{ id: string; name: string }>;
  initialAppId?: string;
  playConnected: boolean;
  lastSyncAt?: string | null;
}) {
  const initial =
    apps.find((app) => app.id && app.id === initialAppId) ||
    apps.find((app) => app.packageName === initialAppId) ||
    apps[0] ||
    null;
  const [packageName, setPackageName] = useState(initial?.packageName || "");
  const [localApps, setLocalApps] = useState(apps);
  const selected = useMemo(
    () => localApps.find((app) => app.packageName === packageName) || null,
    [localApps, packageName],
  );
  const config = useMemo(
    () => detectTestingConfiguration(selected?.playTracks || []),
    [selected],
  );
  const summary = useMemo(() => summarizeConfiguration(config), [config]);
  const preferred = useMemo(() => preferDetectedTrack(config), [config]);
  const explanation = preferred ? testingTypeExplanation(preferred.testingType) : null;
  const trackStatus = preferred
    ? playTrackUiStatus({
        exists: true,
        releaseStatus: preferred.track.releaseStatus,
        detected: true,
      })
    : null;
  const testingUrl = selected && preferred
    ? campaignTestingUrl({
        testingType: preferred.testingType,
        packageName: selected.packageName,
        configuredUrl: selected.webOptInUrl,
      })
    : { url: null as string | null, reason: null as string | null };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetTesters, setTargetTesters] = useState(12);
  const [durationDays, setDurationDays] = useState(14);
  const [optInUrl, setOptInUrl] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configChanged, setConfigChanged] = useState(false);
  const [existingCampaignId, setExistingCampaignId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!selected || !preferred) {
      setName("");
      setDescription("");
      setInstructions("");
      setOptInUrl("");
      return;
    }
    const resolved = campaignTestingUrl({
      testingType: preferred.testingType,
      packageName: selected.packageName,
      configuredUrl: selected.webOptInUrl,
    });
    setName(defaultRequestName(selected.name, preferred.testingType));
    setDescription(defaultRequestDescription(selected.name, preferred.track.releaseNotes));
    setInstructions(defaultTestingInstructions(preferred.testingType));
    setTargetTesters(defaultTargetTesters(selected.testerTarget));
    setDurationDays(defaultDurationDays());
    setOptInUrl(resolved.url || "");
    setExistingCampaignId(null);
    // Identity fields only: a Play refresh that only updates lastSyncAt must not wipe edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selected?.packageName,
    selected?.name,
    selected?.webOptInUrl,
    selected?.testerTarget,
    preferred?.track.track,
    preferred?.testingType,
    preferred?.track.releaseNotes,
  ]);

  async function refreshFromPlay(nextPackage = selected?.packageName) {
    if (!nextPackage) return null;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/google-play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", packageName: nextPackage }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Google Play could not be refreshed.");
      }
      const discovery = data.discovery as
        | { packageName: string; tracks: PlayTrackRecord[]; lastSyncAt?: string }
        | undefined;
      if (discovery?.tracks) {
        setLocalApps((current) =>
          current.map((app) =>
            app.packageName === discovery.packageName
              ? {
                  ...app,
                  playTracks: discovery.tracks,
                  lastSyncAt: discovery.lastSyncAt || app.lastSyncAt,
                }
              : app,
          ),
        );
      }
      return data;
    } finally {
      setRefreshing(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !preferred) return;
    setError(null);
    setConfigChanged(false);
    setExistingCampaignId(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const fingerprint = playTrackFingerprint(preferred.track);
    try {
      await refreshFromPlay(selected.packageName);
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          appId: selected.id || undefined,
          packageName: selected.packageName,
          trackId: selected.testingTracks.find((track) => track.playTrack === preferred.track.track)?.id,
          playTrack: preferred.track.track,
          playFingerprint: fingerprint,
          sourceId: form.get("sourceId") || undefined,
          targetTesters,
          testingType: preferred.testingType,
          playStoreUrl: selected.playStoreUrl || undefined,
          webOptInUrl: optInUrl || undefined,
          durationDays,
          description,
          testingInstructions: instructions,
          reciprocalOpen: form.get("reciprocalOpen") === "on",
          published: true,
        }),
      });
      const data = await response.json();
      if (response.status === 409 && data.code === "CAMPAIGN_DUPLICATE" && data.existingCampaignId) {
        setExistingCampaignId(String(data.existingCampaignId));
        setError(data.error);
        return;
      }
      if (response.status === 409 && data.code === "PLAY_CONFIG_CHANGED") {
        setConfigChanged(true);
        setError(data.error);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Could not create campaign");
      }
      window.location.href = `/campaigns/${data.campaign.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setPending(false);
    }
  }

  if (!playConnected) {
    return (
      <EmptyState
        title="Connect Google Play first"
        body="TestLoop publishes testing requests only for apps already discovered from Google Play Console."
        action={
          <Link href="/play">
            <Button>Connect Google Play</Button>
          </Link>
        }
      />
    );
  }

  if (!localApps.length) {
    return (
      <EmptyState
        title="No Google Play apps discovered"
        body="Refresh from Google Play Console, then select an existing app. TestLoop does not create Play apps or upload bundles."
        action={
          <Link href="/play">
            <Button>Open Google Play</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="New testing request"
        description="Select an app discovered from Google Play Console. TestLoop fills the testing configuration from Play — it does not create tracks or upload bundles."
        action={
          <Button
            type="button"
            variant="secondary"
            disabled={refreshing || !selected}
            onClick={() => refreshFromPlay()}
          >
            {refreshing ? "Refreshing…" : "Refresh from Google Play"}
          </Button>
        }
      />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Application</Label>
          <Select
            name="packageName"
            value={packageName}
            onChange={(event) => {
              setPackageName(event.target.value);
              setConfigChanged(false);
              setExistingCampaignId(null);
              setError(null);
            }}
            required
          >
            {localApps.map((app) => (
              <option key={app.packageName} value={app.packageName}>
                {app.name} · {app.packageName}
              </option>
            ))}
          </Select>
        </div>

        {selected ? (
          <div className="md:col-span-2 space-y-4 rounded-card border border-line bg-surface p-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Application</div>
              <div className="mt-1 font-medium text-slate-900">{selected.name}</div>
              <div className="font-mono text-xs text-muted">{selected.packageName}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source="google-play" />
              <span className="text-sm font-medium text-emerald-700">✓ Connected</span>
              {formatPlayTimestamp(selected.lastSyncAt || lastSyncAt) ? (
                <span className="text-xs text-muted">
                  Last synchronized: {formatPlayTimestamp(selected.lastSyncAt || lastSyncAt)}
                </span>
              ) : null}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Detected testing
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>{summary.internal ? "✓ Internal testing" : "○ Internal testing not detected"}</li>
                <li>{summary.closed ? "✓ Closed testing" : "○ Closed testing not detected"}</li>
                <li>{summary.open ? "✓ Open testing" : "○ Open testing not detected"}</li>
              </ul>
            </div>
            {preferred && trackStatus ? (
              <div className="rounded-control border border-line bg-white p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                  Current recommended configuration
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">Testing type</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {testingTypeLabel(preferred.testingType)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Track</dt>
                    <dd className="mt-0.5 font-mono text-slate-900">{preferred.track.track}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Status</dt>
                    <dd className="mt-0.5">
                      <PlayStatusMark status={trackStatus} />
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted">Source: Google Play Console</p>
                {preferred.ambiguous ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Multiple active testing tracks detected. TestLoop selected{" "}
                    <span className="font-medium">{preferred.track.track}</span> from Google Play data.
                    {preferred.reason}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-6 text-amber-900">
                No testing configuration was detected from Google Play Console. Configure Internal,
                Closed, or Open testing in Play Console, then refresh. TestLoop will not create a
                track.
              </p>
            )}
            {explanation ? (
              <p className="text-sm leading-6 text-slate-700">
                <span className="font-medium">{explanation.title}. </span>
                {explanation.body}
              </p>
            ) : null}
          </div>
        ) : null}

        {configChanged ? (
          <p
            role="status"
            className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 md:col-span-2"
          >
            Google Play configuration changed. TestLoop refreshed the testing configuration. Please
            review the updated information.
          </p>
        ) : null}

        {existingCampaignId ? (
          <p
            role="status"
            className="rounded-control border border-blue-200 bg-brand-soft px-3 py-2 text-sm leading-6 text-blue-900 md:col-span-2"
          >
            An active testing request already exists for this application and testing track.{" "}
            <Link href={`/campaigns/${existingCampaignId}`} className="font-medium text-brand hover:underline">
              Open existing request
            </Link>
          </p>
        ) : null}

        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input name="name" value={name} onChange={(event) => setName(event.target.value)} required />
          <p className="mt-1.5 text-xs leading-5 text-muted">TestLoop name. You can edit it before publishing.</p>
        </div>

        <div>
          <Label>Google Play testing link</Label>
          {testingUrl.url || optInUrl ? (
            <Input
              name="webOptInUrl"
              value={optInUrl}
              onChange={(event) => setOptInUrl(event.target.value)}
            />
          ) : (
            <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-muted">
              {testingUrl.reason || "Not available through Google Play API"}
            </div>
          )}
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {testingUrl.url
              ? "From Google Play / standard testing URL. Editable only if you need to correct it."
              : "TestLoop will not display a fake testing link."}
          </p>
        </div>

        <div>
          <Label>Campaign target</Label>
          <Input
            name="targetTesters"
            type="number"
            min={1}
            max={200}
            value={targetTesters}
            onChange={(event) => setTargetTesters(Number(event.target.value) || 12)}
          />
          <p className="mt-1.5 text-xs leading-5 text-muted">
            TestLoop campaign target. This is not Google Play tester capacity.
          </p>
        </div>

        <div>
          <Label>Testing duration</Label>
          <Input
            name="durationDays"
            type="number"
            min={1}
            max={90}
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.target.value) || 14)}
          />
          <p className="mt-1.5 text-xs leading-5 text-muted">
            TestLoop campaign setting. Google Play does not require this duration.
          </p>
        </div>

        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Testing instructions</Label>
          <Textarea
            name="testingInstructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => setShowMore((value) => !value)}
          >
            {showMore ? "Hide more options" : "More options"}
          </button>
        </div>
        {showMore ? (
          <>
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
            <div className="flex items-end">
              <Checkbox name="reciprocalOpen" defaultChecked label="Reciprocal testing welcome" />
            </div>
          </>
        ) : (
          <input type="hidden" name="reciprocalOpen" value="on" />
        )}

        {error && !existingCampaignId ? (
          <p
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 md:col-span-2"
          >
            {error}
          </p>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" aria-busy={pending} disabled={pending || !preferred}>
            {pending ? "Publishing…" : "Publish testing request"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
