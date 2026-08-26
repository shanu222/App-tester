"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  items,
  onNavigate,
}: {
  items: Array<{ href: string; label: string; section?: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  let lastSection = "";
  return (
    <nav className="flex flex-col gap-0.5 px-3 pb-4" aria-label="Main">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const showSection = item.section && item.section !== lastSection;
        lastSection = item.section || lastSection;
        return (
          <div key={item.href}>
            {showSection ? (
              <div className="mb-1 mt-4 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {item.section}
              </div>
            ) : null}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
