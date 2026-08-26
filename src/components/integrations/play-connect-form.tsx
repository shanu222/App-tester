"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

/** Mirrors the safe diagnostic payload from the API. No credential fields. */
type Diagnostics = {
  connected: boolean;
  serviceAccountEmail: string | null;
  projectId: string | null;
  apiReachable: boolean;
  playConsoleAuthorized: boolean;
  packageAccessible: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
  googleStatus?: string | null;
  googleMessage?: string | null;
  httpStatus?: number | null;
  checkedPackageName?: string | null;
  detail?: string | null;
};

function CheckRow({ label, state }: { label: string; state: boolean | null }) {
  const text = state === null ? "Not checked" : state ? "Yes" : "No";
  const tone =
    state === null ? "text-muted" : state ? "text-success" : "text-red-700";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-700">{label}</span>
      <span className={`font-medium ${tone}`}>{text}</span>
    </div>
  );
}

function DiagnosticsPanel({ result }: { result: Diagnostics }) {
  return (
    <div className="rounded-control border border-line bg-surface p-4 text-sm">
      <div className="space-y-0.5">
        <CheckRow label="Service account authenticated" state={result.apiReachable} />
        <CheckRow label="Play Console authorizes this service account" state={result.playConsoleAuthorized} />
        <CheckRow
          label={
            result.checkedPackageName
              ? `Package accessible (${result.checkedPackageName})`
              : "Package accessible"
          }
          state={result.packageAccessible}
        />
      </div>
      {result.serviceAccountEmail || result.projectId ? (
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {result.serviceAccountEmail ? (
            <div className="flex gap-2">
              <dt className="shrink-0">Service account</dt>
              <dd className="break-all font-mono text-slate-600">{result.serviceAccountEmail}</dd>
            </div>
          ) : null}
          {result.projectId ? (
            <div className="flex gap-2">
              <dt className="shrink-0">Cloud project</dt>
              <dd className="break-all font-mono text-slate-600">{result.projectId}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export function PlayConnectForm() {
  const router = useRouter();
  const [pending, setPending] = useState<"connect" | "diagnose" | null>(null);
  const [result, setResult] = useState<Diagnostics | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [packageName, setPackageName] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("connect");
    setRequestError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAccountJson: form.get("serviceAccountJson"),
          packageName: form.get("packageName") || undefined,
        }),
      });
      const data = (await response.json()) as Diagnostics & { error?: string };
      if (data.errorCode || typeof data.connected === "boolean") {
        setResult(data);
        if (data.connected) router.refresh();
      } else {
        setRequestError(data.error || `Request failed with HTTP ${response.status}.`);
      }
    } catch (cause) {
      setRequestError(
        cause instanceof Error ? cause.message : "The request to TestLoop failed. Check your connection.",
      );
    } finally {
      setPending(null);
    }
  }

  async function runDiagnostics() {
    setPending("diagnose");
    setRequestError(null);
    try {
      const query = packageName.trim() ? `?packageName=${encodeURIComponent(packageName.trim())}` : "";
      const response = await fetch(`/api/google/play/diagnostics${query}`);
      const data = (await response.json()) as Diagnostics & { error?: string };
      if (typeof data.connected === "boolean") {
        setResult(data);
        router.refresh();
      } else {
        setRequestError(data.error || `Diagnostics failed with HTTP ${response.status}.`);
      }
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : "Diagnostics request failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-slate-900">Google Play service account</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Paste the JSON key. TestLoop runs a read-only Android Publisher check and reports exactly what
        Google says before marking this Connected.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="serviceAccountJson">Service account JSON</Label>
          <Textarea
            id="serviceAccountJson"
            name="serviceAccountJson"
            required
            placeholder='{"type":"service_account","client_email":"..."}'
          />
        </div>
        <div>
          <Label htmlFor="packageName">Package name to verify (optional)</Label>
          <Input
            id="packageName"
            name="packageName"
            placeholder="com.example.app"
            value={packageName}
            onChange={(event) => setPackageName(event.target.value)}
          />
        </div>

        {requestError ? (
          <p
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            {requestError}
          </p>
        ) : null}

        {result && !result.connected && result.errorMessage ? (
          <div
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700"
          >
            <p>{result.errorMessage}</p>
            {result.googleMessage && result.googleMessage !== result.errorMessage ? (
              <p className="mt-2 text-xs leading-5 text-red-800">
                Google said: {result.googleMessage}
              </p>
            ) : null}
            {result.errorCode ? (
              <p className="mt-2 font-mono text-xs text-red-800">
                {result.errorCode}
                {result.googleStatus ? ` · ${result.googleStatus}` : ""}
                {result.httpStatus ? ` · HTTP ${result.httpStatus}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {result?.connected ? (
          <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
            {result.detail || "Google Play connected after a live read-only API check."}
          </p>
        ) : null}

        {result ? <DiagnosticsPanel result={result} /> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" aria-busy={pending === "connect"} disabled={pending !== null}>
            {pending === "connect" ? "Checking…" : "Test & connect"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-busy={pending === "diagnose"}
            disabled={pending !== null}
            onClick={runDiagnostics}
          >
            {pending === "diagnose" ? "Running…" : "Run diagnostics on saved key"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
