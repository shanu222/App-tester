"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JsonButton } from "@/components/ui/json-button";
import { PLAY_CONSOLE_URL, PLAY_VERIFY_UNAVAILABLE } from "@/lib/integrations/play-testers";

export function TesterRequestActions({
  participationId,
  gmail,
}: {
  participationId: string;
  gmail: string | null;
}) {
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <p className="text-sm leading-6 text-body">
        Google Play requires this tester to be added to the closed-test tester list manually.
      </p>
      {gmail ? (
        <p className="font-mono text-xs text-slate-600">{gmail}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <a href={PLAY_CONSOLE_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary" type="button">
            Open Play Console
          </Button>
        </a>
        <JsonButton
          url="/api/network"
          body={{ action: "manual-added", participationId }}
          label="Mark as Added"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            const response = await fetch("/api/network", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "verify-tester", participationId }),
            });
            const data = await response.json();
            setVerifyMessage(data.message || PLAY_VERIFY_UNAVAILABLE);
          }}
        >
          Verify tester
        </Button>
      </div>
      {verifyMessage ? (
        <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          {verifyMessage}
        </p>
      ) : null}
    </div>
  );
}
