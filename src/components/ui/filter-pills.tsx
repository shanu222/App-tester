import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterPills({
  items,
  className,
}: {
  items: Array<{ href: string; label: string; active?: boolean }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          className={
            item.active
              ? "rounded-full border border-brand bg-brand-soft px-3.5 py-1.5 text-[13px] font-medium text-brand"
              : "rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 shadow-card transition-colors hover:border-line-strong hover:text-slate-900"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function FilterButtons({
  items,
  className,
}: {
  items: Array<{ id: string; label: string; active?: boolean; onClick: () => void }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          aria-pressed={item.active}
          className={
            item.active
              ? "rounded-full border border-brand bg-brand-soft px-3 py-1.5 text-[13px] font-medium text-brand"
              : "rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-line-strong hover:text-slate-900"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
