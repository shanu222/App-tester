"use client";

import { FormEvent, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function WorkspaceForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/google/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
          adminEmail: form.get("adminEmail") || undefined,
          serviceAccountJson: form.get("serviceAccountJson") || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save this Google Group.");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this Google Group.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Google Group"
        description="Optional. Workspace credentials enable automated group membership."
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="groupEmail">Group email</Label>
          <Input id="groupEmail" name="email" placeholder="testers@googlegroups.com" required />
        </div>
        <div>
          <Label htmlFor="groupName">Name</Label>
          <Input id="groupName" name="name" />
        </div>
        <div>
          <Label htmlFor="adminEmail">Workspace admin email (optional)</Label>
          <Input id="adminEmail" name="adminEmail" />
        </div>
        <div>
          <Label htmlFor="workspaceJson">Workspace service account JSON (optional)</Label>
          <Textarea id="workspaceJson" name="serviceAccountJson" />
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="secondary" aria-busy={pending} disabled={pending}>
          {pending ? "Saving…" : "Save group"}
        </Button>
      </form>
    </Card>
  );
}
