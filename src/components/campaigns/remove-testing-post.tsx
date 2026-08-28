"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RemoveTestingPostButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
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
      const response = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaignId, remove: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "This TestLoop testing post could not be removed.");
        return;
      }
      router.push("/campaigns");
      router.refresh();
    } catch {
      setError("TestLoop could not reach the server. The Google Play app was not changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" type="button" onClick={() => setOpen(true)}>
        Remove post
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
            aria-labelledby="remove-post-title"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="remove-post-title" className="text-lg font-semibold text-slate-900">
              Remove this TestLoop testing post?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              This will stop accepting new TestLoop tester requests for this post. Your Google Play
              app and testing track will remain unchanged.
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
                onClick={confirm}
              >
                {pending ? "Removing…" : "Remove Post"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
