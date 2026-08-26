"use client";

import { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";

export function FeedbackForm({ options }: { options: Array<{ id: string; label: string }> }) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testerCampaignId: form.get("testerCampaignId"),
        overall: Number(form.get("overall") || 0) || undefined,
        bugs: form.get("bugs"),
        uiIssues: form.get("uiIssues"),
        performance: form.get("performance"),
        suggestions: form.get("suggestions"),
        device: form.get("device"),
        androidVersion: form.get("androidVersion"),
        screenshotUrl: form.get("screenshotUrl") || undefined,
        recordingUrl: form.get("recordingUrl") || undefined,
      }),
    });
    window.location.reload();
  }
  return (
    <Card className="p-5">
      <h2 className="font-medium">Record feedback</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Tester / campaign</Label>
          <Select name="testerCampaignId" required>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Overall (1-5)</Label>
          <Input name="overall" type="number" min={1} max={5} />
        </div>
        <div>
          <Label>Device</Label>
          <Input name="device" />
        </div>
        <div>
          <Label>Android version</Label>
          <Input name="androidVersion" />
        </div>
        <div className="md:col-span-2">
          <Label>Bugs</Label>
          <Textarea name="bugs" />
        </div>
        <div>
          <Label>UI issues</Label>
          <Textarea name="uiIssues" />
        </div>
        <div>
          <Label>Performance</Label>
          <Textarea name="performance" />
        </div>
        <div className="md:col-span-2">
          <Label>Suggestions</Label>
          <Textarea name="suggestions" />
        </div>
        <div>
          <Label>Screenshot URL</Label>
          <Input name="screenshotUrl" />
        </div>
        <div>
          <Label>Screen recording link</Label>
          <Input name="recordingUrl" />
        </div>
        <div>
          <Button type="submit">Save feedback</Button>
        </div>
      </form>
    </Card>
  );
}
