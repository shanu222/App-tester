import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
        className,
      )}
      {...props}
    />
  );
}
