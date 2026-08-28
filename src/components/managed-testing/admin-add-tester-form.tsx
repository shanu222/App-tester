"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";

export function AdminAddTesterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [playEmail, setPlayEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/managed-testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-tester",
        name,
        email,
        googleAccountEmail: playEmail || email,
        consented: true,
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to add this tester.");
      return;
    }
    setName("");
    setEmail("");
    setPlayEmail("");
    router.refresh();
  }

  return (
    <form
      className="grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Input required placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <Input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input
        type="email"
        placeholder="Google Play email"
        value={playEmail}
        onChange={(event) => setPlayEmail(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add tester"}
      </Button>
      {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
