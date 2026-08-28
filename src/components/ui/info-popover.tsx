"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoPopover({
  title,
  children,
  label = "More information",
  variant = "info",
  className,
}: {
  title: string;
  children: ReactNode;
  label?: string;
  variant?: "info" | "help";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const Icon = variant === "help" ? CircleHelp : Info;

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={root} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-surface-strong hover:text-slate-700"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={id}
          role="dialog"
          className="absolute left-0 top-7 z-40 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-card border border-line bg-white p-3 text-left shadow-overlay"
        >
          <strong className="block text-sm font-semibold text-slate-900">{title}</strong>
          <span className="mt-1.5 block text-sm leading-6 text-body">{children}</span>
        </span>
      ) : null}
    </span>
  );
}
