"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { InfoPopover } from "@/components/ui/info-popover";
import { SourceBadge } from "@/components/ui/source-badge";
import { PlayStatusMark } from "@/components/play/play-status";
import { formatPlayTimestamp } from "@/components/play/play-connection-panel";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import type { PlayTrackRecord } from "@/lib/integrations/types";
import {
  detectTestingConfiguration,
  playTrackFingerprint,
  playTrackUiStatus,
  preferDetectedTrack,
  selectableTestingTracks,
  summarizeConfiguration,
} from "@/lib/integrations/play-config";
import { campaignTestingUrl, PLAY_CONSOLE_URL } from "@/lib/integrations/play-testers";
import { detectTrackAccess } from "@/lib/integrations/play-access";
import {
  defaultDurationDays,
  defaultRequestDescription,
  defaultRequestName,
  defaultTargetTesters,
  defaultTestingInstructions,
  testingTypeExplanation,
  testingTypeLabel,
} from "@/lib/campaign-autofill";
import { manualFieldsForType } from "@/lib/manual-app";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlayAppOption = {
  id: string;
  name: string;
  packageName: string | null;
  source: "play" | "manual";
  testingType?: "INTERNAL" | "CLOSED" | "OPEN";
  playStoreUrl: string | null;
  webOptInUrl: string | null;
  iconUrl: string | null;
  testerTarget: number;
  lastSyncAt: string | null;
  playTracks: PlayTrackRecord[];
  testingTracks: Array<{ id: string; playTrack: string }>;
};

function FieldLabel({
  htmlFor,
  children,
  infoTitle,
  info,
}: {
  htmlFor?: string;
  children: ReactNode;
  infoTitle?: string;
  info?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-0.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {children}
      </label>
      {infoTitle && info ? <InfoPopover title={infoTitle}>{info}</InfoPopover> : null}
    </div>
  );
}

export function AddAppWizard({
  apps,
  sources,
  initialAppId,
  playConnected,
  lastSyncAt,
  onCancel,
  flow = "add",
}: {
  apps: PlayAppOption[];
  sources: Array<{ id: string; name: string }>;
  initialAppId?: string;
  playConnected: boolean;
  lastSyncAt?: string | null;
  onCancel?: () => void;
  /** Add App keeps the source chooser. Publish skips it and uses already-saved apps. */
  flow?: "add" | "publish";
}) {
  const playApps = useMemo(() => apps.filter((app) => app.source === "play"), [apps]);
  const initialPlay =
    playApps.find((app) => app.id && app.id === initialAppId) ||
    playApps.find((app) => app.packageName === initialAppId) ||
    null;
  const initialManual = apps.find((app) => app.source === "manual" && app.id === initialAppId) || null;
  const [step, setStep] = useState<"mode" | "play" | "manual">(() => {
    if (initialPlay) return "play";
    if (initialManual) return "manual";
    if (flow === "publish") return "play";
    return "mode";
  });

  if (step === "mode") {
    return (
      <Card>
        <CardHeader
          title="Add your app"
          description="Connect Google Play when you can, or publish a TestLoop testing request manually."
          action={
            onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null
          }
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-card border border-line bg-surface p-5 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
            onClick={() => setStep("play")}
          >
            <p className="font-semibold text-slate-900">Connect Google Play</p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Import apps and testing tracks from Play Console.
            </p>
          </button>
          <button
            type="button"
            className="rounded-card border border-line bg-surface p-5 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
            onClick={() => setStep("manual")}
          >
            <p className="font-semibold text-slate-900">Add manually</p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Publish a TestLoop testing request without connecting Play Console.
            </p>
          </button>
        </div>
      </Card>
    );
  }

  if (step === "play") {
    return (
      <PlayRequestForm
        apps={playApps}
        sources={sources}
        initialAppId={initialAppId}
        playConnected={playConnected}
        lastSyncAt={lastSyncAt}
        flow={flow}
        onBack={flow === "publish" ? undefined : () => setStep("mode")}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ManualRequestForm
      initial={initialManual}
      flow={flow}
      onBack={flow === "publish" ? undefined : () => setStep("mode")}
      onCancel={onCancel}
    />
  );
}

function AlreadyPublishedNotice({
  campaignId,
  message,
  onRemoved,
}: {
  campaignId: string;
  message: string;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removePrevious() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaignId, remove: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The previous publishing could not be removed.");
        return;
      }
      onRemoved();
    } catch {
      setError("The previous publishing could not be removed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="status"
      className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2"
    >
      <p>{message}</p>
      <p className="mt-1 text-amber-800">
        Remove the previous publishing to publish this testing type again. This does not remove the app, its other
        testing postings, or change Google Play Console.
      </p>
      {error ? <p className="mt-2 text-red-700">{error}</p> : null}
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="mt-3"
        disabled={pending}
        onClick={() => void removePrevious()}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
    </div>
  );
}

function PlayRequestForm({
  apps,
  sources,
  initialAppId,
  playConnected,
  lastSyncAt,
  flow,
  onBack,
  onCancel,
}: {
  apps: PlayAppOption[];
  sources: Array<{ id: string; name: string }>;
  initialAppId?: string;
  playConnected: boolean;
  lastSyncAt?: string | null;
  flow: "add" | "publish";
  onBack?: () => void;
  onCancel?: () => void;
}) {
  const initial =
    apps.find((app) => app.id && app.id === initialAppId) ||
    apps.find((app) => app.packageName === initialAppId) ||
    apps[0] ||
    null;
  const [selectedKey, setSelectedKey] = useState(initial?.id || initial?.packageName || "");
  const [localApps, setLocalApps] = useState(apps);
  const selected = useMemo(
    () => localApps.find((app) => app.id === selectedKey || app.packageName === selectedKey) || null,
    [localApps, selectedKey],
  );
  const config = useMemo(() => detectTestingConfiguration(selected?.playTracks || []), [selected]);
  const summary = useMemo(() => summarizeConfiguration(config), [config]);
  const preferred = useMemo(() => preferDetectedTrack(config), [config]);
  const testingTracks = useMemo(() => selectableTestingTracks(config), [config]);
  const [selectedTrackName, setSelectedTrackName] = useState(preferred?.track.track || "");
  const chosen = useMemo(() => {
    const track = testingTracks.find((row) => row.track === selectedTrackName);
    if (track && track.typeGuess !== "PRODUCTION") {
      return {
        track,
        testingType: track.typeGuess,
        reason: preferred?.reason || "",
        ambiguous: testingTracks.length > 1,
      };
    }
    return preferred;
  }, [testingTracks, selectedTrackName, preferred]);
  const explanation = chosen ? testingTypeExplanation(chosen.testingType) : null;
  const trackStatus = chosen
    ? playTrackUiStatus({ exists: true, releaseStatus: chosen.track.releaseStatus, detected: true })
    : null;
  const access = chosen ? detectTrackAccess(chosen.testingType, chosen.track) : null;
  const testingUrl =
    selected && chosen
      ? campaignTestingUrl({
          testingType: chosen.testingType,
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
    setSelectedTrackName(preferred?.track.track || "");
  }, [selected?.packageName, preferred?.track.track]);

  useEffect(() => {
    if (!selected || !chosen) {
      setName("");
      setDescription("");
      setInstructions("");
      setOptInUrl("");
      return;
    }
    const resolved = campaignTestingUrl({
      testingType: chosen.testingType,
      packageName: selected.packageName,
      configuredUrl: selected.webOptInUrl,
    });
    setName(defaultRequestName(selected.name, chosen.testingType));
    setDescription(defaultRequestDescription(selected.name, chosen.track.releaseNotes));
    setInstructions(defaultTestingInstructions(chosen.testingType));
    setTargetTesters(defaultTargetTesters(selected.testerTarget));
    setDurationDays(defaultDurationDays());
    setOptInUrl(resolved.url || "");
    setExistingCampaignId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selected?.packageName,
    selected?.name,
    selected?.webOptInUrl,
    selected?.testerTarget,
    chosen?.track.track,
    chosen?.testingType,
    chosen?.track.releaseNotes,
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
      if (!response.ok) throw new Error(data.error || "Google Play could not be refreshed.");
      const discovery = data.discovery as
        | { packageName: string; tracks: PlayTrackRecord[]; lastSyncAt?: string }
        | undefined;
      if (discovery?.tracks) {
        setLocalApps((current) =>
          current.map((app) =>
            app.packageName === discovery.packageName
              ? { ...app, playTracks: discovery.tracks, lastSyncAt: discovery.lastSyncAt || app.lastSyncAt }
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
    if (!selected || !chosen || !selected.packageName) return;
    setError(null);
    setConfigChanged(false);
    setExistingCampaignId(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const fingerprint = playTrackFingerprint(chosen.track);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "play",
          name,
          appId: selected.id || undefined,
          packageName: selected.packageName,
          trackId: selected.testingTracks.find((track) => track.playTrack === chosen.track.track)?.id,
          playTrack: chosen.track.track,
          playFingerprint: fingerprint,
          sourceId: form.get("sourceId") || undefined,
          targetTesters,
          testingType: chosen.testingType,
          playStoreUrl: selected.playStoreUrl || undefined,
          webOptInUrl: optInUrl || undefined,
          durationDays,
          description,
          testingInstructions: instructions,
          reciprocalOpen: form.get("reciprocalOpen") === "on",
          published: true,
          skipPlayRefresh: true,
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
      if (!response.ok) throw new Error(data.error || "Could not create campaign");
      window.location.href = `/campaigns/${data.campaign.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setPending(false);
    }
  }

  const savedPlayApps = localApps.filter((app) => app.id);
  const canPublishSaved = savedPlayApps.length > 0;

  if (!playConnected && !canPublishSaved) {
    return (
      <Card>
        <CardHeader
          title="Connect Google Play"
          action={
            onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                Back
              </Button>
            ) : onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null
          }
        />
        <p className="mt-4 text-sm leading-6 text-body">
          Connect Play Console to import apps and testing tracks automatically.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/play">
            <Button>Connect Google Play</Button>
          </Link>
          {flow === "add" && onBack ? (
            <Button type="button" variant="secondary" onClick={onBack}>
              Add manually instead
            </Button>
          ) : (
            <Link href="/apps">
              <Button type="button" variant="secondary">
                Open My Apps
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  if (!localApps.length) {
    return (
      <Card>
        <CardHeader
          title={flow === "publish" ? "Publish a testing request" : "No Google Play apps discovered"}
          action={
            onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                Back
              </Button>
            ) : onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null
          }
        />
        <p className="mt-4 text-sm leading-6 text-body">
          {flow === "publish"
            ? "Add an app in My Apps first, then publish it from there. Already-imported Google Play apps stay in My Apps until you remove them."
            : "Refresh from Google Play Console, then select an existing app."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {flow === "publish" ? (
            <Link href="/apps">
              <Button>Open My Apps</Button>
            </Link>
          ) : (
            <>
              <Link href="/play">
                <Button>Open Google Play</Button>
              </Link>
              {onBack ? (
                <Button type="button" variant="secondary" onClick={onBack}>
                  Add manually instead
                </Button>
              ) : null}
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="New testing request"
        description="TestLoop fills testing type from Google Play."
        action={
          <div className="flex flex-wrap gap-2">
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                Back
              </Button>
            ) : null}
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={refreshing || !selected} onClick={() => refreshFromPlay()}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FieldLabel>Application</FieldLabel>
          <Select
            value={selectedKey}
            onChange={(event) => {
              setSelectedKey(event.target.value);
              setConfigChanged(false);
              setExistingCampaignId(null);
              setError(null);
            }}
            required
          >
            {localApps.map((app) => (
              <option key={app.id || app.packageName || app.name} value={app.id || app.packageName || ""}>
                {app.name}
              </option>
            ))}
          </Select>
        </div>

        {selected ? (
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 md:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source="google-play" />
              <span className="text-sm font-medium text-emerald-700">Google Play Connected</span>
              {formatPlayTimestamp(selected.lastSyncAt || lastSyncAt) ? (
                <span className="text-xs text-muted">
                  Last synchronized: {formatPlayTimestamp(selected.lastSyncAt || lastSyncAt)}
                </span>
              ) : null}
            </div>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>{summary.internal ? "✓ Internal testing" : "○ Internal testing not detected"}</li>
              <li>{summary.closed ? "✓ Closed testing" : "○ Closed testing not detected"}</li>
              <li>{summary.open ? "✓ Open testing" : "○ Open testing not detected"}</li>
            </ul>
            {testingTracks.length > 1 ? (
              <ul className="space-y-2">
                {testingTracks.map((track) => (
                  <li key={track.track}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-control border border-line bg-white px-3 py-2 text-sm">
                      <input
                        type="radio"
                        className="mt-1"
                        checked={chosen?.track.track === track.track}
                        onChange={() => setSelectedTrackName(track.track)}
                      />
                      <span className="font-medium text-slate-900">
                        {testingTypeLabel(track.typeGuess)} · {track.displayName}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {chosen && trackStatus ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Testing type</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{testingTypeLabel(chosen.testingType)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Status</dt>
                  <dd className="mt-0.5">
                    <PlayStatusMark status={trackStatus} />
                  </dd>
                </div>
                {access ? (
                  <div>
                    <dt className="text-xs text-muted">Access</dt>
                    <dd className="mt-0.5 text-slate-900">{access.publicAccessLabel}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-amber-900">No active testing track found.</p>
                <a href={PLAY_CONSOLE_URL} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary">
                    Open Google Play Console
                  </Button>
                </a>
              </div>
            )}
            {explanation ? (
              <InfoPopover title={explanation.title} label={`What is ${testingTypeLabel(chosen?.testingType || "")}?`}>
                {explanation.body}
              </InfoPopover>
            ) : null}
          </div>
        ) : null}

        {configChanged ? (
          <p role="status" className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2">
            Google Play configuration changed. Review the updated information.
          </p>
        ) : null}

        {existingCampaignId ? (
          <AlreadyPublishedNotice
            campaignId={existingCampaignId}
            message={error || "This app is already published for Closed Testing."}
            onRemoved={() => {
              setExistingCampaignId(null);
              setError(null);
            }}
          />
        ) : null}

        <div className="md:col-span-2">
          <FieldLabel htmlFor="play-title">Testing title</FieldLabel>
          <Input id="play-title" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor="play-link" infoTitle="Testing link" info="Use the Google Play testing or opt-in URL for this track.">
            Google Play testing link
          </FieldLabel>
          {testingUrl.url || optInUrl ? (
            <Input id="play-link" value={optInUrl} onChange={(event) => setOptInUrl(event.target.value)} />
          ) : (
            <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-muted">
              {testingUrl.reason || "Not available"}
            </div>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="play-target">Target testers</FieldLabel>
          <Input
            id="play-target"
            type="number"
            min={1}
            max={200}
            value={targetTesters}
            onChange={(event) => setTargetTesters(Number(event.target.value) || 12)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="play-duration">Testing duration</FieldLabel>
          <Input
            id="play-duration"
            type="number"
            min={1}
            max={90}
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.target.value) || 14)}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="play-desc">Description</FieldLabel>
          <Textarea id="play-desc" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="play-ins">Testing instructions</FieldLabel>
          <Textarea id="play-ins" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <button type="button" className="text-sm font-medium text-brand hover:underline" onClick={() => setShowMore((value) => !value)}>
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
          <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}
        <div className="md:col-span-2">
          <Button type="submit" aria-busy={pending} disabled={pending || !chosen}>
            {pending ? "Publishing…" : "Publish testing request"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ManualRequestForm({
  initial,
  flow,
  onBack,
  onCancel,
}: {
  initial: PlayAppOption | null;
  flow: "add" | "publish";
  onBack?: () => void;
  onCancel?: () => void;
}) {
  const [appName, setAppName] = useState(initial?.name || "");
  const [testingType, setTestingType] = useState<"INTERNAL" | "CLOSED" | "OPEN">(
    initial?.testingType === "OPEN" || initial?.testingType === "INTERNAL" ? initial.testingType : "CLOSED",
  );
  const fields = manualFieldsForType(testingType);
  const [title, setTitle] = useState(initial ? defaultRequestName(initial.name, testingType) : "");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(defaultTestingInstructions(testingType));
  const [targetTesters, setTargetTesters] = useState(initial?.testerTarget || 12);
  const [durationDays, setDurationDays] = useState(14);
  const [link, setLink] = useState(initial?.webOptInUrl || "");
  const [googleGroup, setGoogleGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingCampaignId, setExistingCampaignId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  useEffect(() => {
    if (!titleTouched) setTitle(appName ? defaultRequestName(appName, testingType) : "");
    setInstructions(defaultTestingInstructions(testingType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, testingType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExistingCampaignId(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          appId: initial?.id,
          appName: appName.trim(),
          name: title.trim() || defaultRequestName(appName, testingType),
          testingType,
          targetTesters,
          durationDays,
          description,
          testingInstructions: instructions,
          webOptInUrl: link.trim() || undefined,
          googleGroup: fields.googleGroup ? googleGroup.trim() || undefined : undefined,
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
      if (!response.ok) throw new Error(data.error || "Could not publish this testing request.");
      window.location.href = `/campaigns/${data.campaign.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this testing request.");
    } finally {
      setPending(false);
    }
  }

  const types = [
    { id: "INTERNAL" as const, label: "Internal" },
    { id: "CLOSED" as const, label: "Closed" },
    { id: "OPEN" as const, label: "Open" },
  ];

  return (
    <Card>
      <CardHeader
        title={flow === "publish" ? "New testing request" : "Add manually"}
        description="Publish a TestLoop testing request. TestLoop has not verified this app on Google Play."
        action={
          <div className="flex flex-wrap gap-2">
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                Back
              </Button>
            ) : null}
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3 md:col-span-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-control border border-line bg-brand-soft text-brand">
            <Smartphone className="h-5 w-5" aria-hidden />
          </span>
          <Badge>Manual App</Badge>
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="manual-app-name">App name</FieldLabel>
          <Input
            id="manual-app-name"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            placeholder="My Android app"
            required
            minLength={2}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel
            infoTitle="Testing type"
            info="Choose the Google Play testing type this request is for. TestLoop does not create Play tracks or add testers automatically."
          >
            Testing type
          </FieldLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {types.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "rounded-control border px-3 py-2.5 text-sm font-medium transition-colors",
                  testingType === item.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-white text-slate-700 hover:border-line-strong",
                )}
                onClick={() => setTestingType(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="manual-title">Testing title</FieldLabel>
          <Input
            id="manual-title"
            value={title}
            onChange={(event) => {
              setTitleTouched(true);
              setTitle(event.target.value);
            }}
            placeholder="My Android app — Closed Testing"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="manual-target">Target testers</FieldLabel>
          <Input
            id="manual-target"
            type="number"
            min={1}
            max={200}
            value={targetTesters}
            onChange={(event) => setTargetTesters(Number(event.target.value) || 12)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="manual-duration">Testing duration</FieldLabel>
          <Input
            id="manual-duration"
            type="number"
            min={1}
            max={90}
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.target.value) || 14)}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="manual-desc">Description</FieldLabel>
          <Textarea
            id="manual-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What testers should know"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="manual-ins">Testing instructions</FieldLabel>
          <Textarea
            id="manual-ins"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="How to install and what to test"
          />
        </div>
        {fields.downloadLink ? (
          <div className="md:col-span-2">
            <FieldLabel
              htmlFor="manual-download"
              infoTitle="Test / download link"
              info="Optional. Paste a download or internal testing link if you have one. TestLoop does not generate Play Console internaltest links."
            >
              Test / download link
            </FieldLabel>
            <Input
              id="manual-download"
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
            />
          </div>
        ) : null}
        {fields.playTestingLink ? (
          <div className="md:col-span-2">
            <FieldLabel
              htmlFor="manual-play-link"
              infoTitle="Google Play testing link"
              info="Optional. Paste the Google Play testing or opt-in URL if you already have one."
            >
              Google Play testing link
            </FieldLabel>
            <Input
              id="manual-play-link"
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://play.google.com/apps/testing/…"
            />
          </div>
        ) : null}
        {fields.googleGroup ? (
          <div className="md:col-span-2">
            <FieldLabel
              htmlFor="manual-group"
              infoTitle="Google Group"
              info="Optional. If this closed test uses a Google Group, paste the group email or join link. TestLoop cannot add testers to the group for you."
            >
              Google Group
            </FieldLabel>
            <Input
              id="manual-group"
              value={googleGroup}
              onChange={(event) => setGoogleGroup(event.target.value)}
              placeholder="qa-testers@googlegroups.com"
            />
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Checkbox name="reciprocalOpen" defaultChecked label="Reciprocal testing welcome" />
        </div>
        {existingCampaignId ? (
          <AlreadyPublishedNotice
            campaignId={existingCampaignId}
            message={error || "This app is already published for Closed Testing."}
            onRemoved={() => {
              setExistingCampaignId(null);
              setError(null);
            }}
          />
        ) : null}
        {error && !existingCampaignId ? (
          <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" aria-busy={pending} disabled={pending || appName.trim().length < 2}>
            {pending ? "Publishing…" : "Publish testing request"}
          </Button>
          <TestingTypeBadge type={testingType} />
        </div>
      </form>
    </Card>
  );
}
