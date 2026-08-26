import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "accent";
export type BadgeProps = { children: ReactNode; tone?: BadgeTone; className?: string };

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-slate-600",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  bad: "border-red-200 bg-red-50 text-red-700",
  accent: "border-blue-200 bg-blue-50 text-blue-700",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
