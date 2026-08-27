import { cn } from "@/lib/utils";
import type { PlayUiStatus } from "@/lib/integrations/play-config";

const TONE: Record<PlayUiStatus["kind"], string> = {
  active: "text-emerald-700",
  configured: "text-emerald-700",
  inProgress: "text-blue-700",
  draft: "text-slate-600",
  halted: "text-amber-800",
  notConfigured: "text-muted",
  error: "text-red-700",
};

export function PlayStatusMark({
  status,
  className,
}: {
  status: PlayUiStatus;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", TONE[status.kind], className)}>
      <span aria-hidden>{status.symbol}</span>
      {status.label}
    </span>
  );
}
