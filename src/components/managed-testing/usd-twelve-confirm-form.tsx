"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UsdTwelveConfirmForm({
  token,
  alreadyConfirmed,
}: {
  token: string;
  alreadyConfirmed: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(alreadyConfirmed);
  const [notYet, setNotYet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("token", token);
    if (file) body.set("screenshot", file);
    const response = await fetch("/api/managed-testing/confirm", { method: "POST", body });
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
        Tester confirmed testing. Thank you. This records your confirmation on TestLoop; it is not a Google Play
        verified installation.
      </p>
    );
  }

  if (notYet) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-700">
          Install and use the test app first, then return to this page to confirm your testing activity.
        </p>
        <Button type="button" variant="secondary" onClick={() => setNotYet(false)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-800">Have you installed and tested the app?</p>
      <label className="block text-sm text-slate-700">
        Optional screenshot of testing activity
        <input
          className="mt-1.5 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled={pending} onClick={() => void confirm()}>
          {pending ? "Saving…" : "YES — I HAVE TESTED THE APP"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setNotYet(true)}>
          NOT YET
        </Button>
      </div>
    </div>
  );
}
