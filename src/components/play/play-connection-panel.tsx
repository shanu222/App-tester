"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceAccountWizard } from "@/components/play/service-account-wizard";
import { PlayDiagnosticsPanel, type Diagnostics } from "@/components/play/play-diagnostics-panel";
import { GoogleGlyph } from "@/components/brand/google-glyph";

export type ConnectionView = {
  connected: boolean;
  method: "OAUTH" | "SERVICE_ACCOUNT" | null;
  status: string;
  accountEmail: string | null;
  cloudProjectId: string | null;
  lastVerifiedAt: string | null;
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
  return "neutral" as const;
}

function statusLabel(status: string, connected: boolean) {
  if (connected) return "Connected";
  if (status === "ERROR") return "Not verified";
  if (status === "EXPIRED") return "Authorisation expired";
  return "Not connected";
}

export function PlayConnectionPanel({ connection }: { connection: ConnectionView }) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<Diagnostics | null>(null);

  async function post(path: string, action: string) {
    setPending(action);
    setError(null);
    setVerification(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (typeof data?.connected === "boolean") {
        setVerification(data as Diagnostics);
      } else if (!response.ok) {
        setError(data?.error || `Request failed (HTTP ${response.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach TestLoop. Check your network and retry.");
    } finally {
      setPending(null);
    }
  }

  if (!connection.connected && connection.status === "NOT_CONNECTED" && !showWizard) {
    return (
      <Card>
        <CardHeader
          title="Connect your Google Play Console"
          description="Connect your real Google Play Developer account so TestLoop can read your apps and testing tracks through Google's official API."
        />
        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-body">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          TestLoop never asks for your Google password.
        </p>

        <div className="mt-5 border-t border-line pt-5">
          <div className="text-sm font-medium text-slate-900">Choose how you want to connect</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {connection.oauthAvailable ? (
              <a
                href="/api/google-play/connect/oauth"
                className="inline-flex h-9.5 items-center gap-2 rounded-control border border-line-strong bg-white px-4 text-sm font-medium text-slate-700 shadow-card transition-colors hover:bg-surface"
              >
                <GoogleGlyph />
                Connect with Google
              </a>
            ) : null}
            <Button variant="secondary" onClick={() => setShowWizard(true)}>
              <KeyRound className="mr-2 h-4 w-4" aria-hidden />
              Connect with Service Account
            </Button>
          </div>
          {!connection.oauthAvailable ? (
            <p className="mt-3 text-xs leading-5 text-muted">
              Connecting with Google is unavailable because this server has no Google OAuth client
              configured. Use a service account, or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
            </p>
          ) : null}
        </div>

        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
          Your credentials are encrypted at rest, kept server-side, and never sent back to the browser.
        </p>
      </Card>
    );
  }

  if (!connection.connected && showWizard) {
    return (
      <Card>
        <CardHeader
          title="Connect with a service account"
          description="Six steps in Google Cloud and Play Console, then TestLoop verifies the key against the real API."
        />
        <div className="mt-5 border-t border-line pt-5">
          <ServiceAccountWizard onCancel={() => setShowWizard(false)} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Google Play"
        action={
          <Badge tone={statusTone(connection.status, connection.connected)}>
            {statusLabel(connection.status, connection.connected)}
          </Badge>
        }
      />

      <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-muted">
            {connection.method === "SERVICE_ACCOUNT" ? "Service account" : "Google account"}
          </dt>
          <dd className="mt-1 truncate font-mono text-[13px] text-slate-700">
            {connection.accountEmail || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Connection method</dt>
          <dd className="mt-1 text-slate-700">
            {connection.method ? METHOD_LABEL[connection.method] : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">API status</dt>
          <dd className="mt-1 text-slate-700">{connection.connected ? "Healthy" : "Needs attention"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Last verified</dt>
          <dd className="mt-1 text-slate-700">
            {connection.lastVerifiedAt
              ? new Date(connection.lastVerifiedAt).toLocaleString()
              : "Never"}
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
        <Button
          variant="secondary"
          disabled={pending !== null}
          onClick={() => post("/api/google-play/verify", "verify")}
        >
          {pending === "verify" ? "Checking…" : "Refresh connection"}
        </Button>
        <Button
          variant="secondary"
          disabled={pending !== null}
          onClick={() => post("/api/google-play/apps", "apps")}
        >
          {pending === "apps" ? "Refreshing…" : "Refresh apps"}
        </Button>
        <Button
          variant="danger"
          disabled={pending !== null}
          onClick={() => post("/api/google-play/disconnect", "disconnect")}
        >
          {pending === "disconnect" ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          {error}
        </p>
      ) : null}
      {verification ? <PlayDiagnosticsPanel result={verification} className="mt-4" /> : null}
    </Card>
  );
}
