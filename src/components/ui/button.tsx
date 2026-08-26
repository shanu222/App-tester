import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50",
    secondary:
      "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700",
    ghost: "text-slate-300 hover:bg-slate-800",
    danger: "bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
