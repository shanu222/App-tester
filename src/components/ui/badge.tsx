import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "accent";
export type BadgeProps = { children: ReactNode; tone?: BadgeTone };

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const tones = {
    neutral: "bg-slate-800 text-slate-300",
    good: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-200",
    bad: "bg-rose-500/15 text-rose-300",
    accent: "bg-sky-500/15 text-sky-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}
