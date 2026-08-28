import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/auth";
import { isDemoMode } from "@/lib/env";
import { signOutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { type NavItem } from "@/components/layout/sidebar-nav";
import { SiteFooter } from "@/components/layout/public-chrome";
import { UnreadNotificationsProvider } from "@/components/notifications/unread-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { unreadInboxCountForUser } from "@/lib/services/inbox";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "Main", icon: "home" },
  { href: "/requests", label: "Discover Testing", section: "Main", icon: "requests" },
  { href: "/testing", label: "My Testing", section: "Main", icon: "testing" },
  { href: "/apps", label: "My Apps", section: "Developer", icon: "apps" },
  { href: "/campaigns", label: "Testing Requests", section: "Developer", icon: "campaigns" },
  { href: "/managed-testing", label: "Managed Testing", section: "Developer", icon: "managed" },
  { href: "/play", label: "Google Play", section: "Developer", icon: "play" },
  { href: "/testers", label: "Testers", section: "Developer", icon: "testers" },
  { href: "/activity", label: "Notifications", section: "Account", icon: "notifications" },
  { href: "/messages", label: "Messages", section: "Account", icon: "messages" },
  { href: "/settings", label: "Settings", section: "Account", icon: "settings" },
];

export async function AppShell({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const user = await requireUser();
  if (!user.profileCompleted) redirect("/profile/complete");
  const unread = await unreadInboxCountForUser(user.id);
  const items: NavItem[] =
    user.role === "ADMIN"
      ? [
          ...NAV,
          { href: "/admin", label: "Admin", section: "Account", icon: "admin" },
          { href: "/admin/managed-testing", label: "Managed Testing", section: "Account", icon: "managed" },
        ]
      : NAV;

  return (
    <UnreadNotificationsProvider initialUnread={unread}>
      <div className="min-h-screen bg-white lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <AppSidebar items={items} />

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:py-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
                ) : null}
                {isDemoMode() ? (
                  <p className="mt-0.5 text-xs font-medium text-amber-700">Demo mode</p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {actions}
                <NotificationBell />
                <Link
                  href="/profile"
                  className="hidden items-center gap-2 rounded-control px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-strong sm:inline-flex"
                >
                  <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                    {(user.developerName || user.name || "D").charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-32 truncate">{user.developerName || user.name || "Developer"}</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-control text-slate-500 transition-colors hover:bg-surface-strong hover:text-slate-900"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut className="h-4.5 w-4.5" aria-hidden />
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>

          <SiteFooter homeHref="/dashboard" />
        </div>
      </div>
    </UnreadNotificationsProvider>
  );
}
