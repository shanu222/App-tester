"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InfoModal({
  title,
  children,
  label = "More information",
  className,
}: {
  title: string;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const headingId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-overlay"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={headingId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <div className="mt-3 text-sm leading-6 text-body">{children}</div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
