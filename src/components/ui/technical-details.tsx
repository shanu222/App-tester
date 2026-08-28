import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TechnicalDetails({
  title = "Technical details",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("rounded-control border border-line bg-surface px-3 py-2", className)}>
      <summary className="cursor-pointer text-sm font-medium text-slate-700">{title}</summary>
      <div className="mt-2 space-y-1 break-all text-xs leading-5 text-muted">{children}</div>
    </details>
  );
}
