import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  const tones = {
    neutral: "bg-slate-800 text-slate-300",
    good: "bg-teal-500/15 text-teal-300",
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
