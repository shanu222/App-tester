"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLink } from "lucide-react";
import type { GoogleGroupConfigured, TesterJoinKind } from "@/lib/integrations/play-access";

type JoinView = {
  ok: boolean;
  outcome: string;
  title: string;
  detail: string;
  email: string | null;
  appName: string;
  trackLabel: string;
  testingUrl: string | null;
  testingUnavailable?: string | null;
};

type JoinPayload = {
  next?: string;
  joinKind?: TesterJoinKind;
  groupJoinUrl?: string | null;
  publicAccessLabel?: string;
  groupConfigured?: GoogleGroupConfigured;
  join?: JoinView;
};

type TimelineStep = { id: string; label: string; state: "done" | "current" | "todo" };

function JoinTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="mt-4 space-y-2 text-sm">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2">
          <span className="mt-0.5 w-4 text-center text-xs font-semibold text-slate-700" aria-hidden>
            {step.state === "done" ? "✓" : step.state === "current" ? "●" : "○"}
          </span>
          <span className={step.state === "todo" ? "text-muted" : "text-slate-900"}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function AcceptTestForm({
  campaignId,
  appName,
  ownerName,
  durationDays,
  defaultGmail,
  testingType,
  joinKind,
  groupConfigured,
  publicAccessLabel,
  groupJoinUrl: initialGroupJoinUrl,
  alreadyAccepted,
  initialNext,
  initialJoin,
}: {
  campaignId: string;
  appName: string;
  ownerName: string;
  durationDays: number;
  defaultGmail: string;
  testingType: string;
  joinKind: TesterJoinKind;
  groupConfigured: GoogleGroupConfigured;
  publicAccessLabel: string;
  groupJoinUrl: string | null;
  alreadyAccepted?: boolean;
  initialNext?: "accept" | "gmail" | "group" | "result" | "ready";
  initialJoin?: JoinView | null;
}) {
  const startStep = alreadyAccepted
    ? initialNext === "ready" || initialNext === "result"
      ? "result"
      : initialNext === "group"
        ? "group"
        : joinKind === "open"
          ? "result"
          : joinKind === "google_group"
            ? "group"
            : "confirm"
    : "start";
  const [step, setStep] = useState<"start" | "confirm" | "group" | "result">(startStep);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [join, setJoin] = useState<JoinView | null>(initialJoin || null);
  const [groupUrl, setGroupUrl] = useState<string | null>(initialGroupJoinUrl);
  const [groupClicked, setGroupClicked] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);

  function applyPayload(data: JoinPayload) {
    if (data.groupJoinUrl) setGroupUrl(data.groupJoinUrl);
    if (data.join) setJoin(data.join);
    if (data.next === "ready" || data.next === "result") {
      setStep("result");
      return;
    }
    if (data.next === "group") {
      setStep("group");
      return;
    }
    if (data.next === "gmail") {
      setStep("confirm");
      return;
    }
    setStep("result");
  }

  async function accept() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", campaignId }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not accept this request");
      return;
    }
    applyPayload(data as JoinPayload);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "consent",
        campaignId,
        gmail: form.get("gmail"),
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not confirm Gmail");
      return;
    }
    applyPayload(data as JoinPayload);
  }

  async function checkGroupAccess() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-group-access", campaignId }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "TestLoop could not verify Google Play access.");
      return;
    }
    setCheckedAccess(true);
    applyPayload(data as JoinPayload);
  }

  const timeline = useMemo<TimelineStep[]>(() => {
    if (joinKind === "open") {
      return [
        { id: "accepted", label: "Request accepted", state: step === "start" ? "current" : "done" },
        { id: "method", label: "Open testing detected", state: step === "start" ? "todo" : "done" },
        { id: "play", label: "Google Play access", state: step === "result" ? "done" : "todo" },
        { id: "ready", label: "Ready to test", state: step === "result" ? "done" : "todo" },
      ];
    }
    if (joinKind === "google_group") {
      const groupDone = groupClicked || checkedAccess || step === "result";
      return [
        { id: "accepted", label: "Request accepted", state: step === "start" ? "current" : "done" },
        { id: "method", label: "Closed testing detected", state: step === "start" ? "todo" : "done" },
        {
          id: "group",
          label: "Waiting for Google Group membership",
          state: step === "group" && !groupDone ? "current" : groupDone ? "done" : "todo",
        },
        {
          id: "play",
          label: "Google Play access",
          state: checkedAccess || (step === "result" && Boolean(join?.testingUrl)) ? "done" : "todo",
        },
        {
          id: "ready",
          label: "Ready to test",
          state: step === "result" && Boolean(join?.testingUrl) ? "done" : "todo",
        },
      ];
    }
    return [
      { id: "accepted", label: "Request accepted", state: step === "start" ? "current" : "done" },
      {
        id: "method",
        label: testingType === "INTERNAL" ? "Internal testing detected" : "Closed testing detected",
        state: step === "start" ? "todo" : "done",
      },
      {
        id: "access",
        label: "Waiting for developer",
        state: join?.title === "Tester request submitted" || join?.title === "Waiting for developer" ? "current" : step === "result" ? "done" : "todo",
      },
      { id: "play", label: "Google Play access", state: Boolean(join?.testingUrl) ? "done" : "todo" },
      { id: "ready", label: "Ready to test", state: Boolean(join?.testingUrl) ? "done" : "todo" },
    ];
  }, [checkedAccess, groupClicked, join, joinKind, step, testingType]);

  if (step === "result" && join) {
    return (
      <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {join.title === "Tester request submitted" || join.title === "Waiting for developer"
            ? "Waiting"
            : join.ok
              ? "Join complete"
              : "Action required"}
        </p>
        <h2 className="mt-2 text-[15px] font-semibold text-slate-900">{join.title}</h2>
        <p className="mt-2 text-sm leading-6 text-body">{join.detail}</p>
        <JoinTimeline steps={timeline} />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">App</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{join.appName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Testing</dt>
            <dd className="mt-0.5 text-slate-900">{join.trackLabel}</dd>
          </div>
          {join.email ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted">Google account</dt>
              <dd className="mt-0.5 break-all text-slate-900">{join.email}</dd>
            </div>
          ) : null}
        </dl>
        {join.testingUrl ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={join.testingUrl} target="_blank" rel="noreferrer">
              <Button>
                Open Google Play
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
            <CopyButton value={join.testingUrl} label="Copy testing link" />
          </div>
        ) : join.title === "Tester request submitted" || join.title === "Waiting for developer" ? (
          <p className="mt-5 text-sm leading-6 text-muted">
            You can follow this request from My Testing. TestLoop will email you after the developer confirms.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            <p className="text-sm text-muted">{join.testingUnavailable || "Google Play testing link unavailable"}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void accept()} disabled={pending}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "group") {
    return (
      <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Choose how you want to join this test</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Google Play requires you to have access to this app&apos;s testing track before you can install it.
        </p>
        <JoinTimeline steps={timeline} />
        <div className="mt-5 rounded-control border border-line bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Join the Google Group</p>
          <p className="mt-2 text-sm leading-6 text-body">
            This app uses a Google Group for closed testing. Join the developer&apos;s existing testing group using
            the Google account you use on Google Play.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            After joining the Google Group, return to TestLoop and verify your access.
          </p>
          {groupUrl ? (
            <a
              href={groupUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setGroupClicked(true)}
              className="mt-4 inline-flex"
            >
              <Button type="button">
                Join Google Group
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Google Group join link unavailable. Refresh from Google Play on the developer side, or open Google Play
              after the developer shares the group invite.
            </p>
          )}
          {groupClicked ? (
            <p className="mt-4 text-sm font-medium text-emerald-800">Step 1 completed. Use the same Google account in Google Play.</p>
          ) : null}
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => void checkGroupAccess()} disabled={pending}>
              {pending ? "Checking…" : "Check group access"}
            </Button>
          </div>
        </div>
        {groupConfigured !== true ? (
          <button
            type="button"
            className="mt-4 text-sm font-medium text-brand hover:underline"
            onClick={() => setStep("confirm")}
          >
            Use individual tester access instead
          </button>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form onSubmit={confirm} className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Individual tester access</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          Application: <strong className="font-medium text-slate-900">{appName}</strong>
          <br />
          Developer: {ownerName} ({durationDays} days)
        </p>
        {publicAccessLabel ? <p className="mt-2 text-sm text-slate-700">{publicAccessLabel}</p> : null}
        <JoinTimeline steps={timeline} />
        <div className="mt-5 max-w-sm">
          <Label htmlFor="accept-gmail">Enter the Gmail account you use with Google Play</Label>
          <Input
            id="accept-gmail"
            name="gmail"
            type="email"
            defaultValue={defaultGmail}
            placeholder="yourgmail@gmail.com"
            required
          />
        </div>
        <p className="mt-3 max-w-xl text-xs leading-5 text-muted">
          Your Gmail will be submitted for tester enrollment. TestLoop does not add individual Gmail addresses to a
          Play tester list. The developer completes that action in Play Console when Google Play requires it.
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5">
          <Button type="submit" aria-busy={pending} disabled={pending}>
            {pending ? "Saving…" : "Request test access"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
        >
          {error}
        </p>
      ) : null}
      <p className="mb-4 text-sm leading-6 text-muted">{publicAccessLabel}</p>
      <Button type="button" aria-busy={pending} onClick={accept} disabled={pending}>
        {pending ? "Working…" : "Accept & Become Tester"}
      </Button>
    </div>
  );
}
