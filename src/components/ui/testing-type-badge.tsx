import { cn } from "@/lib/utils";
import { testingTypeLabel } from "@/lib/campaign-autofill";

const STYLES = {
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CLOSED: "border-violet-200 bg-violet-50 text-violet-800",
  INTERNAL: "border-sky-200 bg-sky-50 text-sky-800",
} as const;

const DOT = {
  OPEN: "bg-emerald-500",
  CLOSED: "bg-violet-500",
  INTERNAL: "bg-sky-500",
} as const;

export function TestingTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const key = type === "OPEN" || type === "INTERNAL" ? type : "CLOSED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[key],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[key])} aria-hidden />
      {testingTypeLabel(type)}
    </span>
  );
}
