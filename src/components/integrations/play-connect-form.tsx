"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function PlayConnectForm() {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/google/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceAccountJson: form.get("serviceAccountJson"),
        packageName: form.get("packageName") || undefined,
      }),
    });
    const data = await response.json();
    setMessage(data.detail || data.error || JSON.stringify(data));
  }
  return (
    <Card className="p-5">
      <h2 className="font-medium">Google Play service account</h2>
      <p className="mt-1 text-sm text-slate-400">
        Paste the JSON key. Grant this service account Play Console access, then TesterBridge verifies before marking Connected.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <Label>Service account JSON</Label>
          <Textarea name="serviceAccountJson" required placeholder='{"type":"service_account","client_email":"..."}' />
        </div>
        <div>
          <Label>Package name to verify (optional)</Label>
          <Input name="packageName" placeholder="com.example.net360" />
        </div>
        <Button type="submit">Test & connect</Button>
      </form>
      {message ? <p className="mt-3 text-sm text-teal-300">{message}</p> : null}
    </Card>
  );
}
