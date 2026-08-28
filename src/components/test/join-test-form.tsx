"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { InfoPopover } from "@/components/ui/info-popover";
import { CheckCircle2, ExternalLink } from "lucide-react";

type JoinView = {
  outcome: "READY" | "REGISTERED" | "FAILED";
  statusLabel: string;
  detail: string;
  email: string;
  appName: string;
  testingTypeLabel?: string;
  developerName: string;
  optInUrl: string | null;
  groupJoinUrl?: string | null;
  joinKind?: string;
};

export function JoinTestForm({
  slug,
  testingType,
  joinKind,
  publicAccessLabel,
}: {
  slug: string;
  testingType?: string;
  joinKind?: string;
  publicAccessLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinView | null>(null);
  const openTesting = testingType === "OPEN";
  const groupTesting = joinKind === "google_group";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/test/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "This test could not be joined right now.");
      }
      setResult(data.result as JoinView);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This test could not be joined right now.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return <JoinResultCard result={result} onReset={() => setResult(null)} />;
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      {publicAccessLabel ? <p className="text-sm text-muted">{publicAccessLabel}</p> : null}
      <div>
        <div className="flex items-center gap-1">
          <Label htmlFor="gmail">{openTesting ? "Email" : "Gmail"}</Label>
          <InfoPopover title="Why we ask">
            {openTesting
              ? "TestLoop records your email for this request. You join and install through Google Play."
              : groupTesting
                ? "TestLoop can record your Gmail. Join the Google Group with the same Google account you use on Google Play."
                : "Use the Google account you use on Google Play. TestLoop registers your request; Google Play controls tester access."}
          </InfoPopover>
        </div>
        <Input
          id="gmail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={openTesting ? "you@example.com" : "yourname@gmail.com"}
        />
        {!openTesting ? (
          <p className="mt-1.5 text-xs text-muted">Enter the Google account you use with Google Play.</p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
        {pending ? "Joining…" : groupTesting ? "Request test access" : "Join Test"}
      </Button>
    </form>
  );
}

function JoinResultCard({
  result,
  onReset,
}: {
  result: JoinView;
  onReset: () => void;
}) {
  const success = result.outcome === "READY" || result.outcome === "REGISTERED";

  if (success) {
    return (
      <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-slate-900">You&apos;re in!</h2>
            <p className="mt-2 text-sm leading-6 text-body">{result.detail}</p>
          </div>
        </div>
        {result.groupJoinUrl ? (
          <div className="mt-5">
            <a href={result.groupJoinUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto" variant="secondary">
                Join Google Group
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
          </div>
        ) : null}
        {result.optInUrl ? (
          <div className="mt-5">
            <a href={result.optInUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto">
                Open Google Play
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
          </div>
        ) : null}
        <button type="button" onClick={onReset} className="mt-4 text-sm font-medium text-brand hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-card border border-red-200 bg-red-50 p-5">
      <h2 className="text-base font-semibold text-slate-900">Unable to join testing</h2>
      <p className="mt-2 text-sm leading-6 text-body">We couldn&apos;t complete your testing registration.</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">What happened?</summary>
        <p className="mt-2 text-sm leading-6 text-body">{result.detail}</p>
      </details>
      <div className="mt-5 flex flex-wrap gap-2">
        {result.optInUrl ? (
          <a href={result.optInUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm">Open Google Play</Button>
          </a>
        ) : null}
        <Button type="button" size="sm" variant="secondary" onClick={onReset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
