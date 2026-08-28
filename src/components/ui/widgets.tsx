import { Badge } from "@/components/ui/badge";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { TesterStatus } from "@prisma/client";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: TesterStatus }) {
  const tone =
    status === "BLOCKED" || status === "ERROR" || status === "DECLINED"
      ? "bad"
      : status === "OPTED_IN" || status === "TESTING" || status === "COMPLETED"
        ? "good"
        : status === "ADDING" || status === "OPT_IN_PENDING" || status === "INSTALL_STATUS_UNKNOWN"
          ? "warn"
          : "accent";
  return <Badge tone={tone}>{TESTER_STATUS_LABELS[status]}</Badge>;
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-white px-5 py-8 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-white p-4 shadow-card", className)}>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs leading-5 text-muted">{hint}</div> : null}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-44 rounded bg-surface-strong" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-card border border-line bg-white shadow-card" />
        ))}
      </div>
      <div className="h-56 rounded-card border border-line bg-white shadow-card" />
    </div>
  );
}
