import { Badge } from "@/components/ui/badge";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import type { TesterStatus } from "@prisma/client";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: TesterStatus }) {
  const tone =
    status === "BLOCKED" || status === "ERROR" || status === "DECLINED"
      ? "bad"
      : status === "OPTED_IN" || status === "TESTING" || status === "COMPLETED" || status === "GROUP_MEMBER"
        ? "good"
        : status === "OPT_IN_PENDING" || status === "INSTALL_STATUS_UNKNOWN"
          ? "warn"
          : "accent";
  return <Badge tone={tone}>{TESTER_STATUS_LABELS[status]}</Badge>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
      <h2 className="text-base font-medium text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-md bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl border border-slate-800 bg-slate-900" />
        ))}
      </div>
      <div className="h-48 rounded-xl border border-slate-800 bg-slate-900" />
    </div>
  );
}
