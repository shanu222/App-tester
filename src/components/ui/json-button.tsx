"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function JsonButton({
  url,
  method = "POST",
  body,
  label,
  variant = "primary",
  onDone,
}: {
  url: string;
  method?: string;
  body?: unknown;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onDone?: (data: unknown) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const response = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Request failed");
            onDone?.(data);
            if (!onDone) window.location.reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Working…" : label}
      </Button>
      {error ? <span className="max-w-xs text-xs text-rose-300">{error}</span> : null}
    </span>
  );
}
