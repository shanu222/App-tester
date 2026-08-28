"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { InfoPopover } from "@/components/ui/info-popover";
import { PLAY_CONSOLE_URL } from "@/lib/integrations/play-testers";
import type { TesterJoinKind } from "@/lib/integrations/play-access";

export function TesterRequestActions({
  participationId,
  testerName,
  gmail,
  statusLabel,
  joinKind,
  groupEmail,
  canConfirm,
  canReject = true,
}: {
  participationId: string;
  testerName: string;
  gmail: string | null;
  statusLabel: string;
  joinKind: TesterJoinKind;
  groupEmail?: string | null;
  canConfirm: boolean;
  canReject?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setConfirmOpen(false);
    }
    if (confirmOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, pending]);

  async function post(action: "manual-added" | "reject-tester") {
    setPending(action);
    setError(null);
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, participationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update this request.");
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this request.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-muted">Tester</dt>
        <dd className="font-medium text-slate-900">{testerName}</dd>
        <dt className="text-muted">Google Play email</dt>
        <dd className="font-mono text-slate-800">{gmail || "Not shared yet"}</dd>
        <dt className="text-muted">Status</dt>
        <dd>{statusLabel}</dd>
      </dl>

      {joinKind === "google_group" ? (
        <p className="text-sm leading-6 text-body">
          This track uses a Google Group. Add testers through the group, not an individual email list.
          {groupEmail ? (
            <>
              {" "}
              Group: <span className="font-mono text-sm">{groupEmail}</span>
            </>
          ) : null}
          <InfoPopover title="Google Group testing" className="ml-1 align-middle">
            TestLoop cannot add this tester through the Play API. The tester must join the configured Google Group
            with the Google account they use on Google Play.
          </InfoPopover>
        </p>
      ) : (
        <p className="text-sm leading-6 text-body">
          Add this tester in Google Play Console if the track supports individual testers.
          <InfoPopover title="Play Console" className="ml-1 align-middle">
            TestLoop cannot add individual Gmail addresses through the Google Play API. Confirm only after you have
            added the tester in Play Console or the Google Group.
          </InfoPopover>
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {gmail ? <CopyButton value={gmail} label="Copy Email" /> : null}
        {groupEmail ? <CopyButton value={groupEmail} label="Copy Group Email" /> : null}
        <a href={PLAY_CONSOLE_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary" type="button" size="sm">
            Open Google Play Console
          </Button>
        </a>
        {canConfirm ? (
          <Button type="button" size="sm" disabled={pending !== null} onClick={() => setConfirmOpen(true)}>
            I&apos;ve Added This Tester
          </Button>
        ) : null}
        {canReject ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending !== null}
            onClick={() => void post("reject-tester")}
          >
            Reject Request
          </Button>
        ) : null}
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!pending) setConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-overlay"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={headingId} className="text-lg font-semibold text-slate-900">
              Confirm tester addition
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Only confirm this after you have added this tester to the appropriate Google Play testing track or Google
              Group.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" disabled={pending !== null} onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending !== null} onClick={() => void post("manual-added")}>
                {pending === "manual-added" ? "Saving…" : "Confirm Added"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
