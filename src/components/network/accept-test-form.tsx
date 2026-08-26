"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

export function AcceptTestForm({
  campaignId,
  appName,
  ownerName,
  durationDays,
  defaultGmail,
}: {
  campaignId: string;
  appName: string;
  ownerName: string;
  durationDays: number;
  defaultGmail: string;
}) {
  const [step, setStep] = useState<"start" | "confirm">("start");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    window.location.href = "/testing";
  }

  if (step === "confirm") {
    return (
      <form onSubmit={confirm} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold">Confirm testing participation</h2>
        <p className="mt-2 text-sm text-slate-400">
          You are agreeing to test <strong className="text-slate-200">{appName}</strong> by {ownerName} for {durationDays}{" "}
          days. Your Google Play Gmail is shared with the app owner only after this confirmation.
        </p>
        <div className="mt-4">
          <Label>Your Google Play Gmail</Label>
          <Input name="gmail" type="email" defaultValue={defaultGmail} required />
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Working…" : "Confirm & join test"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
      <Button type="button" onClick={accept} disabled={pending}>
        {pending ? "Working…" : "Accept testing request"}
      </Button>
    </div>
  );
}
