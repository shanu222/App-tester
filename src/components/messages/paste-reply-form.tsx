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
    if (data.needsGmail) {
      setResult(`No Gmail found. Suggested reply:\n\n${data.suggestedReply}`);
      return;
    }
    setResult(
      data.preferred
        ? `Detected: ${data.preferred.normalized} · ${data.preferred.label} · added to ${data.message?.campaignId ? "campaign" : "workspace"}`
        : data.error || "No email detected.",
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="paste-person">Paste reply</Label>
        <Input id="paste-person" name="personName" placeholder="Person name" />
      </div>
      <Textarea name="text" placeholder="Sure, my Gmail is tester@gmail.com" required />
      <Button type="submit" variant="secondary">
        Extract email
      </Button>
      {result ? (
        <p className="whitespace-pre-wrap rounded-control border border-blue-200 bg-brand-soft px-3 py-2 text-sm leading-6 text-blue-800">
          {result}
        </p>
      ) : null}
    </form>
  );
}
