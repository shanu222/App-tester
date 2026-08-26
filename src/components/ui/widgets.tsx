import { Badge } from "@/components/ui/badge";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import type { TesterStatus } from "@prisma/client";

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
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{body}</p>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
