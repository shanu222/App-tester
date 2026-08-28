"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceAccountWizard } from "@/components/play/service-account-wizard";
import { PlayDiagnosticsPanel, type Diagnostics } from "@/components/play/play-diagnostics-panel";
import { playConnectionStatusLabel } from "@/lib/play-disconnect";

export type ConnectionView = {
  connected: boolean;
  method: "OAUTH" | "SERVICE_ACCOUNT" | null;
  status: string;
  accountEmail: string | null;
  cloudProjectId: string | null;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  oauthAvailable: boolean;
};

const METHOD_LABEL = {
  OAUTH: "Google OAuth",
  SERVICE_ACCOUNT: "Service account",
} as const;

function statusTone(status: string, connected: boolean) {
  if (connected) return "good" as const;
  if (status === "ERROR" || status === "EXPIRED") return "bad" as const;
  if (status === "CONNECTING") return "warn" as const;
  return "neutral" as const;
}

export function formatPlayTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DisconnectConfirmModal({
  pending,
  cleanupFailed,
  error,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  cleanupFailed: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-play-title"
        className="w-full max-w-lg rounded-card border border-line bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="disconnect-play-title" className="text-lg font-semibold text-slate-900">
          Disconnect Google Play?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Disconnecting Google Play will remove this developer&apos;s synchronized Google Play apps,
          testing configuration, track information, and TestLoop testing posts associated with this
          connection.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          TestLoop can only automatically manage and verify Google Play testing information while
          your Play Console connection is active. You will need to reconnect Google Play to create
          new testing posts or synchronize Play Console information.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Existing TestLoop testing posts associated with the connection will be removed or disabled.
          Google Play Console itself is not deleted or modified. Apps and testers are not deleted
          from Google Play. Only TestLoop&apos;s synchronized data is removed. Reconnecting allows
          synchronization again.
        </p>
        <div className="mt-4 flex gap-2.5 rounded-control border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm leading-6 text-amber-900">
            This action affects your TestLoop data only. Your actual Google Play Console data will
            remain unchanged.
          </p>
        </div>
        {error ? (
          <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            className="border-red-700 bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {pending
              ? cleanupFailed
                ? "Retrying…"
                : "Disconnecting…"
                : cleanupFailed
                  ? "Retry cleanup"
                  : "Disconnect & Remove TestLoop Data"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PlayConnectionPanel({
  connection,
  onRefresh,
}: {
  connection: ConnectionView;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const [verification, setVerification] = useState<Diagnostics | null>(null);

  async function refreshFromPlay() {
    setPending("apps");
    setError(null);
    setVerification(null);
    try {
      const response = await fetch("/api/google-play/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await response.json();
      if (typeof data?.connected === "boolean") {
        setVerification(data as Diagnostics);
      } else if (!response.ok) {
        setError(data?.error || `Request failed (HTTP ${response.status}).`);
        return;
      }
      onRefresh?.();
      router.refresh();
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
    } finally {
      setPending(null);
    }
  }

  async function confirmDisconnectAction() {
    setPending("disconnect");
    setError(null);
    try {
      const response = await fetch("/api/google-play/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || `Request failed (HTTP ${response.status}).`);
        return;
      }
      if (data?.disconnected && data?.cleanupCompleted === false) {
        setCleanupFailed(true);
        setError(
          data?.error ||
            "Google Play was disconnected, but some TestLoop data could not be removed.",
        );
        onRefresh?.();
        router.refresh();
        return;
      }
      setConfirmDisconnect(false);
      setCleanupFailed(false);
      onRefresh?.();
      router.refresh();
    } catch {
      setError("Google Play could not be reached. Your TestLoop data has not been changed.");
    } finally {
      setPending(null);
    }
  }

  const statusLabel = playConnectionStatusLabel(connection);
  const leftoverRecord = !connection.connected && connection.status !== "NOT_CONNECTED";

  if (!connection.connected && showWizard) {
    return (
      <Card>
        <CardHeader
          title="Connect Google Play with a service account"
          description="Six steps in Google Cloud and Play Console, then TestLoop verifies the key against the real API."
        />
        <div className="mt-5 border-t border-line pt-5">
          <ServiceAccountWizard onCancel={() => setShowWizard(false)} />
        </div>
      </Card>
    );
  }

  if (!connection.connected) {
    return (
      <Card>
        <CardHeader
          title="Google Play"
          description="Connect TestLoop to your Google Play Developer account to discover your existing apps, testing tracks and releases."
          action={<Badge tone={statusTone(connection.status, false)}>{statusLabel}</Badge>}
        />
        <p className="mt-1 text-sm font-medium text-slate-800">Google Play not connected</p>
        <p className="mt-2 text-sm leading-6 text-body">
          Connect your Google Play Developer account to use Play-connected TestLoop testing.
        </p>
        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-body">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          TestLoop never asks for your Google Play password.
        </p>

        {connection.lastError ? (
          <div className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm leading-6 text-red-800">{connection.lastError}</p>
            {connection.errorCode ? (
              <p className="mt-1 font-mono text-[11px] text-red-700">{connection.errorCode}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <Button onClick={() => setShowWizard(true)}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden />
            Connect Google Play with Service Account
          </Button>
          {leftoverRecord ? (
            <Button variant="danger" onClick={() => setConfirmDisconnect(true)}>
              Disconnect
            </Button>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          TestLoop uses a Google Play service account with the permissions you grant in Google Play
          Console. Your credentials are securely stored on the server.
        </p>
        {error ? (
          <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : null}
        {confirmDisconnect ? (
          <DisconnectConfirmModal
            pending={pending === "disconnect"}
            cleanupFailed={cleanupFailed}
            error={error}
            onCancel={() => {
              if (pending === "disconnect") return;
              setConfirmDisconnect(false);
              setCleanupFailed(false);
              setError(null);
            }}
            onConfirm={confirmDisconnectAction}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Google Play"
        description="TestLoop can now discover your existing Play Console apps, testing tracks and releases."
        action={<Badge tone="good">{statusLabel}</Badge>}
      />
      <p className="mt-1 text-sm font-medium text-slate-800">Google Play connected</p>

      <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-muted">Developer account</dt>
          <dd className="mt-1 truncate font-mono text-[13px] text-slate-700">
            {connection.accountEmail || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Status</dt>
          <dd className="mt-1 text-slate-700">Connected</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Connection method</dt>
          <dd className="mt-1 text-slate-700">
            {connection.method ? METHOD_LABEL[connection.method] : "Service account"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Last synchronized</dt>
          <dd className="mt-1 text-slate-700">
            {formatPlayTimestamp(connection.lastSyncAt || connection.lastVerifiedAt) || "Never"}
          </dd>
        </div>
      </dl>

      {connection.lastError ? (
        <div className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm leading-6 text-red-800">{connection.lastError}</p>
          {connection.errorCode ? (
            <p className="mt-1 font-mono text-[11px] text-red-700">{connection.errorCode}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="secondary" disabled={pending !== null} onClick={refreshFromPlay}>
          {pending === "apps" ? "Refreshing…" : "Refresh from Google Play"}
        </Button>
        <Button variant="secondary" disabled={pending !== null} onClick={() => setShowWizard(true)}>
          Replace service account
        </Button>
        <Button
          variant="danger"
          disabled={pending !== null}
          onClick={() => {
            setCleanupFailed(false);
            setError(null);
            setConfirmDisconnect(true);
          }}
        >
          Disconnect
        </Button>
      </div>

      {error && !confirmDisconnect ? (
        <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          {error}
        </p>
      ) : null}
      {verification ? <PlayDiagnosticsPanel result={verification} className="mt-4" /> : null}
      {showWizard ? (
        <div className="mt-5 border-t border-line pt-5">
          <ServiceAccountWizard onCancel={() => setShowWizard(false)} />
        </div>
      ) : null}
      {confirmDisconnect ? (
        <DisconnectConfirmModal
          pending={pending === "disconnect"}
          cleanupFailed={cleanupFailed}
          error={error}
          onCancel={() => {
            if (pending === "disconnect") return;
            setConfirmDisconnect(false);
            setCleanupFailed(false);
            setError(null);
          }}
          onConfirm={confirmDisconnectAction}
        />
      ) : null}
    </Card>
  );
}
