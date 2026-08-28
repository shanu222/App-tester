"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Action = "stop" | "archive" | "delete";

const COPY: Record<
  Action,
  { title: string; body: string; confirm: string; pending: string; button: string; danger: boolean }
> = {
  stop: {
    title: "Stop testing request?",
    body: "New testers will no longer be able to join this TestLoop request. Google Play Console will not be changed.",
    confirm: "Stop request",
    pending: "Stopping…",
    button: "Stop testing request",
    danger: false,
  },
  archive: {
    title: "Archive testing request?",
    body: "This TestLoop request will be archived. Your Google Play application, release, and testing track will not be changed.",
    confirm: "Archive",
    pending: "Archiving…",
    button: "Archive",
    danger: false,
  },
  delete: {
    title: "Delete testing request?",
    body: "This will permanently remove this archived request from TestLoop. Google Play is not changed.",
    confirm: "Delete",
    pending: "Deleting…",
    button: "Delete permanently",
    danger: true,
  },
};

export function TestingRequestActionButton({
  campaignId,
  action,
  label,
  variant,
  size = "md",
  redirectTo,
}: {
  campaignId: string;
  action: Action;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];

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
      const body =
        action === "stop"
          ? { id: campaignId, stop: true }
          : action === "delete"
            ? { id: campaignId, deletePermanently: true }
            : { id: campaignId, remove: true };
      const response = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "This TestLoop testing request could not be updated.");
        return;
      }
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch {
      setError("TestLoop could not reach the server. The Google Play app was not changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant={variant || (copy.danger ? "danger" : "secondary")}
        size={size}
        type="button"
        onClick={() => setOpen(true)}
      >
        {label || copy.button}
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
            aria-labelledby={`${action}-request-title`}
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={`${action}-request-title`} className="text-lg font-semibold text-slate-900">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{copy.body}</p>
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
                variant={copy.danger ? "danger" : "primary"}
                disabled={pending}
                className={
                  copy.danger
                    ? "border-red-700 bg-red-600 text-white hover:bg-red-700"
                    : undefined
                }
                onClick={confirm}
              >
                {pending ? copy.pending : copy.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
