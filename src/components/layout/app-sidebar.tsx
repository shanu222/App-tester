"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SidebarNav, type NavItem } from "@/components/layout/sidebar-nav";

export function AppSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-4">
        <BrandLogo href="/dashboard" size="md" />
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line-strong text-slate-600 lg:hidden"
          aria-expanded={open}
          aria-controls="app-sidebar-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
      </div>
      <div id="app-sidebar-nav" className={open ? "block border-t border-line pt-2" : "hidden lg:block"}>
        <SidebarNav items={items} onNavigate={() => setOpen(false)} />
      </div>
    </aside>
  );
}
