"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CONFIRM_TITLE = "Remove this app from TestLoop?";
const CONFIRM_BODY =
  "This will only remove the app and its TestLoop data from TestLoop. It will NOT delete or modify the app in Google Play Console.";

export function RemoveAppButton({
  appId,
  onRemoved,
}: {
  appId: string;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "This app could not be removed from TestLoop.");
        return;
      }
      setOpen(false);
      onRemoved();
    } catch {
      setError("TestLoop could not reach the server. The Google Play app was not changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Remove
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-app-title"
            aria-describedby="remove-app-body"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="remove-app-title" className="text-lg font-semibold text-slate-900">
              {CONFIRM_TITLE}
            </h2>
            <p id="remove-app-body" className="mt-3 text-sm leading-6 text-slate-700">
              {CONFIRM_BODY}
            </p>
            {error ? (
              <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                className="border-red-700 bg-red-600 text-white hover:bg-red-700"
                onClick={() => void confirm()}
              >
                {pending ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
