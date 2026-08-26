import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-card hover:bg-brand-hover active:bg-brand-hover disabled:bg-slate-300 disabled:text-white disabled:shadow-none",
  secondary:
    "border border-line-strong bg-white text-slate-700 shadow-card hover:bg-surface hover:text-slate-900 disabled:bg-white disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-surface-strong hover:text-slate-900 disabled:text-slate-400",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:border-line disabled:bg-white disabled:text-slate-400",
};

const SIZES = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-9.5 gap-2 px-4 text-sm",
} as const;

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
