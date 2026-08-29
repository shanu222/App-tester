"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/fields";
import { PlayDiagnosticsPanel, type Diagnostics } from "@/components/play/play-diagnostics-panel";

const STEPS = [
  {
    title: "Create a service account",
    body: "In Google Cloud Console, open IAM & Admin → Service Accounts and create one for TestLoop.",
  },
  {
    title: "Enable the Play APIs",
    body: "Enable the Google Play Android Developer API. Enable the Play Developer Reporting API too if you want TestLoop to list your apps automatically.",
  },
  {
    title: "Download the JSON key",
    body: "Open the service account → Keys → Add key → Create new key → JSON.",
  },
  {
    title: "Invite it to Play Console",
    body: "In Play Console → Users and permissions, invite the service account's email address.",
  },
  {
    title: "Grant only what is needed",
    body: "Give it view access to app information plus release permissions for the testing tracks you want TestLoop to manage.",
  },
  {
    title: "Upload the key file",
    body: "TestLoop verifies it against the real Play API and stores it in encrypted server-side storage. The key is never shown again.",
  },
];

export function ServiceAccountWizard({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnostics | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    const form = event.currentTarget;
    const payload = new FormData(form);
    try {
      const response = await fetch("/api/google-play/connect/service-account", {
        method: "POST",
        body: payload,
      });
      const data = await response.json();
      if (typeof data?.connected === "boolean") {
        setResult(data as Diagnostics);
        if (data.connected) {
          if (fileRef.current) fileRef.current.value = "";
          router.refresh();
        }
        return;
      }
      setError(data?.error || `Connection check failed (HTTP ${response.status}).`);
    } catch {
      setError("Could not reach TestLoop to run the connection check. Check your network and retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <ol className="space-y-2.5">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-body">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">{step.title}</div>
              <p className="mt-0.5 text-sm leading-6 text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="mt-5 border-t border-line pt-5">
        <Label htmlFor="keyFile">Service account JSON key file</Label>
        <input
          ref={fileRef}
          id="keyFile"
          name="keyFile"
          type="file"
          accept="application/json,.json"
          required
          disabled={pending}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-control file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800"
        />
        <Hint>
          The file is sent to TestLoop once, stored encrypted on the server, and never returned to the browser.
        </Hint>

        <div className="mt-4">
          <Label htmlFor="packageName">Package name to verify (optional)</Label>
          <Input id="packageName" name="packageName" placeholder="com.example.app" spellCheck={false} />
          <Hint>
            Given a package name, TestLoop also confirms this key can read that specific app.
          </Hint>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Verifying with Google…" : "Verify and connect"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          {error}
        </p>
      ) : null}
      {result ? <PlayDiagnosticsPanel result={result} className="mt-4" /> : null}
    </div>
  );
}
