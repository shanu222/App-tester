"use client";

import { FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";

export function CreateAppForm() {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        packageName: form.get("packageName"),
        testingType: form.get("testingType"),
        testingTrack: form.get("testingTrack"),
        googlePlayLink: form.get("googlePlayLink"),
        testerTarget: Number(form.get("testerTarget") || 12),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error);
      return;
    }
    window.location.reload();
  }
  return (
    <Card>
      <CardHeader title="Add Android app" description="Store and testing URLs are kept separate." />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <Label>App name</Label>
          <Input name="name" placeholder="NET360 Preparation" required />
        </div>
        <div>
          <Label>Package name</Label>
          <Input name="packageName" placeholder="com.example.net360" required />
        </div>
        <div>
          <Label>Testing type</Label>
          <Select name="testingType" defaultValue="CLOSED">
            <option value="INTERNAL">Internal</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
          </Select>
        </div>
        <div>
          <Label>Testing track</Label>
          <Input name="testingTrack" placeholder="Closed testing" />
        </div>
        <div>
          <Label>Google Play testing link</Label>
          <Input name="googlePlayLink" placeholder="https://play.google.com/apps/testing/com.example.net360" />
        </div>
        <div>
          <Label>Tester target</Label>
          <Input name="testerTarget" type="number" defaultValue={12} />
        </div>
        <div className="flex items-end md:col-span-2">
          <Button type="submit">Save app</Button>
        </div>
      </form>
    </Card>
  );
}
