"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavIcon = keyof typeof ICONS;

const ICONS = {
  home: LayoutDashboard,
  apps: Smartphone,
  requests: Search,
  campaigns: ClipboardList,
  testing: Activity,
  testers: Users,
  messages: MessageSquare,
  play: Building2,
  analytics: BarChart3,
  profile: UserRound,
  integrations: Plug,
  settings: Settings,
  admin: ShieldCheck,
} as const;

export type NavItem = { href: string; label: string; section?: string; icon: NavIcon };

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  let lastSection = "";

  return (
    <nav className="flex flex-col gap-0.5 px-3 pb-6" aria-label="Main">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const showSection = item.section && item.section !== lastSection;
        lastSection = item.section || lastSection;
        const Icon = ICONS[item.icon];

        return (
          <div key={item.href}>
            {showSection ? (
              <div className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 first:mt-0">
                {item.section}
              </div>
            ) : null}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-slate-600 hover:bg-surface-strong hover:text-slate-900",
              )}
            >
              <Icon
                className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand" : "text-slate-400")}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
