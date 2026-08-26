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
      <form onSubmit={confirm} className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Confirm testing participation</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          You are agreeing to test <strong className="font-medium text-slate-900">{appName}</strong> by{" "}
          {ownerName} for {durationDays} days. Your Google Play Gmail is shared with the app owner only after
          this confirmation.
        </p>
        <div className="mt-5 max-w-sm">
          <Label htmlFor="accept-gmail">Your Google Play Gmail</Label>
          <Input id="accept-gmail" name="gmail" type="email" defaultValue={defaultGmail} required />
        </div>
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
            {pending ? "Working…" : "Confirm & join test"}
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
        {pending ? "Working…" : "Accept testing request"}
      </Button>
    </div>
  );
}
