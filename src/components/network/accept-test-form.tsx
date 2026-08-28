"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLink } from "lucide-react";

type JoinView = {
  ok: boolean;
  outcome: string;
  title: string;
  detail: string;
  email: string | null;
  appName: string;
  trackLabel: string;
  testingUrl: string | null;
};

export function AcceptTestForm({
  campaignId,
  appName,
  ownerName,
  durationDays,
  defaultGmail,
  alreadyAccepted,
}: {
  campaignId: string;
  appName: string;
  ownerName: string;
  durationDays: number;
  defaultGmail: string;
  alreadyAccepted?: boolean;
}) {
  const [step, setStep] = useState<"start" | "confirm" | "result">(alreadyAccepted ? "confirm" : "start");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [join, setJoin] = useState<JoinView | null>(null);

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
    setStep("confirm");
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
    setJoin(data.join as JoinView);
    setStep("result");
  }

  if (step === "result" && join) {
    return (
      <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {join.title === "Waiting for developer"
            ? "Waiting"
            : join.ok
              ? "Join complete"
              : "Action required"}
        </p>
        <h2 className="mt-2 text-[15px] font-semibold text-slate-900">{join.title}</h2>
        <p className="mt-2 text-sm leading-6 text-body">{join.detail}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">App</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{join.appName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Track</dt>
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
        ) : null}
        {!join.ok ? (
          <p className="mt-4 text-sm text-muted">
            This test is not marked as successfully joined. You can retry from My Testing.
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form onSubmit={confirm} className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Join Test</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          Application: <strong className="font-medium text-slate-900">{appName}</strong>
          <br />
          Developer: {ownerName} ({durationDays} days)
        </p>
        <div className="mt-5 max-w-sm">
          <Label htmlFor="accept-gmail">Enter the Gmail account you use on Google Play</Label>
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
          Your Gmail is shared only with the app owner so they can complete Play Console tester
          access where Google Play requires it. TestLoop does not add individual Gmail addresses to
          a Play tester list.
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
            {pending ? "Saving…" : "Join Test"}
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
      <Button type="button" aria-busy={pending} onClick={accept} disabled={pending}>
        {pending ? "Working…" : "Accept Test"}
      </Button>
    </div>
  );
}
