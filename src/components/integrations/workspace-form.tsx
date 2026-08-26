"use client";

import { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function WorkspaceForm() {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/google/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
        adminEmail: form.get("adminEmail") || undefined,
        serviceAccountJson: form.get("serviceAccountJson") || undefined,
      }),
    });
    window.location.reload();
  }
  return (
    <Card className="p-5">
      <h2 className="font-medium">Google Group</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <Label>Group email</Label>
          <Input name="email" placeholder="net360-testers@googlegroups.com" required />
        </div>
        <div>
          <Label>Name</Label>
          <Input name="name" />
        </div>
        <div>
          <Label>Workspace admin email (optional)</Label>
          <Input name="adminEmail" />
        </div>
        <div>
          <Label>Workspace service account JSON (optional)</Label>
          <Textarea name="serviceAccountJson" />
        </div>
        <Button type="submit" variant="secondary">
          Save group
        </Button>
      </form>
    </Card>
  );
}
