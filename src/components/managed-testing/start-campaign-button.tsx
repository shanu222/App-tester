"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartCampaignButton({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/managed-testing/${publicId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to start this campaign.");
      return;
    }
    router.push(`/managed-testing/${publicId}`);
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="button" disabled={pending} onClick={() => void start()}>
        {pending ? "Starting…" : "Confirm & Start Testing"}
      </Button>
    </div>
  );
}
