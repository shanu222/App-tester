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
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <Label>Add tester manually</Label>
      <Input name="name" placeholder="Name" />
      <Input name="email" type="email" placeholder="tester@gmail.com" required />
      <Button type="submit">Add tester</Button>
    </form>
  );
}
