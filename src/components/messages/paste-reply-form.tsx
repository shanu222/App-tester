"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function PasteReplyForm({ campaignId }: { campaignId: string }) {
  const [result, setResult] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        personName: form.get("personName"),
        text: form.get("text"),
      }),
    });
    const data = await response.json();
    setResult(
      data.preferred
        ? `Detected: ${data.preferred.normalized} · ${data.preferred.label}`
        : data.error || "No email detected.",
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Label>Paste reply</Label>
      <Input name="personName" placeholder="Person name" />
      <Textarea name="text" placeholder="Sure, my Gmail is tester@gmail.com" required />
      <Button type="submit" variant="secondary">
        Extract email
      </Button>
      {result ? <p className="text-sm text-teal-300">{result}</p> : null}
    </form>
  );
}
