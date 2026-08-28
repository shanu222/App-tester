"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TesterJoinForm({
  token,
  joinUrl,
  alreadyConfirmed,
}: {
  token: string;
  joinUrl: string | null;
  alreadyConfirmed: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(alreadyConfirmed);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("token", token);
    if (file) body.set("screenshot", file);
    const response = await fetch("/api/managed-testing/join", { method: "POST", body });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to save confirmation.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Confirmation received.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {joinUrl ? (
        <a href={joinUrl} target="_blank" rel="noreferrer">
          <Button type="button">Join Test</Button>
        </a>
      ) : null}
      <div>
        <p className="text-sm font-medium text-slate-800">Have you completed the testing setup?</p>
        <label className="mt-3 block text-sm text-slate-700">
          Upload screenshot
          <input
            className="mt-1.5 block w-full text-sm"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="button" disabled={pending} onClick={() => void confirm()}>
        {pending ? "Saving…" : "Yes, I've joined the test"}
      </Button>
    </div>
  );
}
