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
    primary: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500",
    secondary: "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 disabled:opacity-50",
    ghost: "text-slate-300 hover:bg-slate-800 disabled:opacity-50",
    danger: "border border-rose-500/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 disabled:opacity-50",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
