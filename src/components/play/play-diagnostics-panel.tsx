import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mirrors the safe PlayDiagnostics payload. Carries no credentials or tokens. */
export type Diagnostics = {
  connected: boolean;
  method: "SERVICE_ACCOUNT" | "OAUTH";
  accountEmail: string | null;
  serviceAccountEmail: string | null;
  projectId: string | null;
  apiReachable: boolean;
  playConsoleAuthorized: boolean;
  packageAccessible: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
  googleStatus: string | null;
  googleReason: string | null;
  googleMessage: string | null;
  httpStatus: number | null;
  checkedPackageName: string | null;
  detail: string | null;
  checkedAt: string;
};

function CheckRow({ label, state }: { label: string; state: boolean | null }) {
  const Icon = state === true ? Check : state === false ? X : Minus;
  const tone =
    state === true ? "text-success" : state === false ? "text-danger" : "text-slate-400";
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
      <span className="text-sm leading-6 text-body">{label}</span>
    </div>
  );
}

/**
 * Shows exactly what Google answered, including its own status and message, so
 * a failure is never reduced to a generic error.
 */
export function PlayDiagnosticsPanel({
  result,
  className,
}: {
  result: Diagnostics;
  className?: string;
}) {
  return (
    <div className={cn("rounded-control border border-line bg-surface p-4", className)}>
      <CheckRow
        label={
          result.method === "OAUTH"
            ? "Google account authenticated"
            : "Service account authenticated"
        }
        state={result.apiReachable}
      />
      <CheckRow label="Play Console authorises this connection" state={result.playConsoleAuthorized} />
      <CheckRow
        label={
          result.checkedPackageName
            ? `Package accessible (${result.checkedPackageName})`
            : "Package check not requested"
        }
        state={result.packageAccessible}
      />

      <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-xs sm:grid-cols-2">
        {result.accountEmail ? (
          <div className="min-w-0">
            <dt className="text-muted">Account</dt>
            <dd className="mt-0.5 truncate font-mono text-slate-700">{result.accountEmail}</dd>
          </div>
        ) : null}
        {result.projectId ? (
          <div className="min-w-0">
            <dt className="text-muted">Cloud project</dt>
            <dd className="mt-0.5 truncate font-mono text-slate-700">{result.projectId}</dd>
          </div>
        ) : null}
      </dl>

      {result.detail ? <p className="mt-3 text-sm leading-6 text-body">{result.detail}</p> : null}

      {result.errorMessage ? (
        <div className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm leading-6 text-red-800">{result.errorMessage}</p>
          {result.errorCode ? (
            <p className="mt-1 font-mono text-[11px] text-red-700">{result.errorCode}</p>
          ) : null}
          {result.googleMessage ? (
            <p className="mt-1.5 text-xs leading-5 text-red-700">
              Google reported: {result.googleMessage}
              {result.googleStatus ? ` (${result.googleStatus})` : ""}
              {result.httpStatus ? ` · HTTP ${result.httpStatus}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
