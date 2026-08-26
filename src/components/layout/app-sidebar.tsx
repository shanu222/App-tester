"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppSidebar({
  items,
}: {
  items: Array<{ href: string; label: string; section?: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="border-b border-slate-800 bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:py-4">
        <BrandLogo href="/dashboard" size="md" />
        <button
          type="button"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 lg:hidden"
          aria-expanded={open}
          aria-controls="app-sidebar-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div id="app-sidebar-nav" className={open ? "block" : "hidden lg:block"}>
        <SidebarNav items={items} onNavigate={() => setOpen(false)} />
      </div>
    </aside>
  );
}
