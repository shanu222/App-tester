import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { signOutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteFooter } from "@/components/layout/public-chrome";

const NAV = [
  { href: "/dashboard", label: "Home", section: "Workspace" },
  { href: "/apps", label: "My Apps", section: "Workspace" },
  { href: "/requests", label: "Testing Requests", section: "Testing" },
  { href: "/campaigns", label: "My Testing Requests", section: "Testing" },
  { href: "/testing", label: "My Testing", section: "Testing" },
  { href: "/testers", label: "Testers", section: "Testing" },
  { href: "/messages", label: "Messages", section: "Account" },
  { href: "/play", label: "Google Play", section: "Account" },
  { href: "/analytics", label: "Analytics", section: "Account" },
  { href: "/profile", label: "Developer Profile", section: "Account" },
  { href: "/integrations", label: "Integrations", section: "Account" },
  { href: "/settings", label: "Settings", section: "Account" },
];

export async function AppShell({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  const user = await requireUser();
  if (!user.profileCompleted) redirect("/profile/complete");
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  const items = user.role === "ADMIN" ? [...NAV, { href: "/admin", label: "Admin", section: "Account" }] : NAV;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <AppSidebar items={items} />
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {isDemoMode() ? (
              <p className="text-xs text-amber-200">DEMO MODE — no production APIs are called.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <Link href="/activity" className="text-sm text-slate-300 hover:text-white">
              Alerts{unread ? ` (${unread})` : ""}
            </Link>
            <Link href="/profile" className="text-sm text-slate-400 hover:text-white">
              {user.developerName || user.name || "Developer"}
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-400 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        <SiteFooter homeHref="/dashboard" />
      </div>
    </div>
  );
}
