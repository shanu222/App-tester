"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { CopyButton } from "@/components/ui/copy-button";
import type { PublicJoinResult } from "@/lib/testing-page";
import { CheckCircle2, ExternalLink } from "lucide-react";

export function JoinTestForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicJoinResult | null>(null);

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
        throw new Error(data.error || "TestLoop could not register this tester.");
      }
      setResult(data.result as PublicJoinResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "TestLoop could not register this tester.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return <JoinResultCard result={result} onReset={() => setResult(null)} />;
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <div>
        <Label htmlFor="gmail">Gmail</Label>
        <Input
          id="gmail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="yourname@gmail.com"
        />
        <p className="mt-1.5 text-xs leading-5 text-muted">
          TestLoop records your registration. Google Play remains the source of tester access.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Joining…" : "Join Test"}
      </Button>
    </form>
  );
}

function JoinResultCard({
  result,
  onReset,
}: {
  result: PublicJoinResult;
  onReset: () => void;
}) {
  const success = result.outcome === "READY" || result.outcome === "REGISTERED";

  return (
    <div className="mt-8">
      <div
        className={
          success
            ? "rounded-card border border-emerald-200 bg-emerald-50 p-5"
            : "rounded-card border border-red-200 bg-red-50 p-5"
        }
      >
        <div className="flex items-start gap-2.5">
          {success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden /> : null}
          <div>
            <h2 className="text-base font-semibold text-slate-900">{result.statusLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-body">{result.detail}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Application</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{result.appName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Gmail</dt>
            <dd className="mt-0.5 break-all text-slate-900">{result.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Track</dt>
            <dd className="mt-0.5 text-slate-900">{result.trackLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Developer</dt>
            <dd className="mt-0.5 text-slate-900">{result.developerName}</dd>
          </div>
        </dl>

        {result.optInUrl ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={result.optInUrl} target="_blank" rel="noreferrer">
              <Button>
                Open Google Play
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
            <CopyButton value={result.optInUrl} label="Copy Testing Link" />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm font-medium text-brand hover:underline"
      >
        Join with a different email
      </button>
    </div>
  );
}
