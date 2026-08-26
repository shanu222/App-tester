"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

export function ManualTesterForm({ campaignId }: { campaignId: string }) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/testers/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        email: form.get("email"),
        name: form.get("name"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Could not add tester");
      return;
    }
    window.location.reload();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="manual-tester-name">Add tester manually</Label>
        <Input id="manual-tester-name" name="name" placeholder="Name" />
      </div>
      <Input name="email" type="email" placeholder="tester@gmail.com" required />
      <Button type="submit" variant="secondary">
        Add tester
      </Button>
    </form>
  );
}
