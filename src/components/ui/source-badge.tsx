import { cn } from "@/lib/utils";

export type DataSource = "google-play" | "testloop" | "calculated" | "limitation" | "action";

const STYLES: Record<DataSource, string> = {
  "google-play": "border-emerald-200 bg-emerald-50 text-emerald-800",
  testloop: "border-blue-200 bg-blue-50 text-blue-800",
  calculated: "border-line bg-surface text-slate-600",
  limitation: "border-amber-200 bg-amber-50 text-amber-800",
  action: "border-amber-200 bg-amber-50 text-amber-800",
};

const LABELS: Record<DataSource, string> = {
  "google-play": "Google Play",
  testloop: "TestLoop",
  calculated: "Calculated",
  limitation: "API limitation",
  action: "Manual action required",
};

export function SourceBadge({
  source,
  className,
}: {
  source: DataSource;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STYLES[source],
        className,
      )}
    >
      {LABELS[source]}
    </span>
  );
}
