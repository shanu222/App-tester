"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { firebaseAuth } from "@/lib/firebase/client";

const CONFIRM_TITLE = "Delete your TestLoop account?";
const CONFIRM_BODY =
  "This action is permanent. Your account and all your TestLoop data will be permanently deleted. This cannot be undone. If you return later, you will need to create a new account.";

export function DeleteAccountCard() {
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
      const response = await fetch("/api/account", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Your account could not be deleted. Try again.");
        return;
      }
      if (firebaseAuthConfigured()) {
        await firebaseAuth()
          .signOut()
          .catch(() => undefined);
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Your account could not be deleted. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Delete Account"
          description="Permanently delete your TestLoop account. This cannot be undone."
        />
        <div className="mt-5">
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            Delete Account
          </Button>
        </div>
      </Card>
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
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-body"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-account-title" className="text-lg font-semibold text-slate-900">
              {CONFIRM_TITLE}
            </h2>
            <p id="delete-account-body" className="mt-3 text-sm leading-6 text-slate-700">
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
                {pending ? "Deleting…" : "Yes, Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
