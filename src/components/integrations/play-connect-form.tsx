"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function PlayConnectForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
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
      const data = await response.json();
      if (!response.ok || !data.connected) {
        throw new Error(data.error || "Could not connect Google Play. Check the service account and try again.");
      }
      setSuccess(data.detail || "Google Play connected after a live API check.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Google Play.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-slate-900">Google Play service account</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Paste the JSON key. Grant this service account Play Console access, then TestLoop verifies before marking
        Connected.
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
          <Input id="packageName" name="packageName" placeholder="com.example.app" />
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-700">
            {success}
          </p>
        ) : null}
        <Button type="submit" aria-busy={pending} disabled={pending}>
          {pending ? "Checking…" : "Test & connect"}
        </Button>
      </form>
    </Card>
  );
}
