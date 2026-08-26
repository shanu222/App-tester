import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { signOutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/apps", label: "My Apps" },
  { href: "/requests", label: "Find Testing Requests" },
  { href: "/campaigns", label: "My Testing Requests" },
  { href: "/testing", label: "My Testing" },
  { href: "/testers", label: "Testers" },
  { href: "/messages", label: "Messages" },
  { href: "/play", label: "Google Play" },
  { href: "/analytics", label: "Analytics" },
  { href: "/profile", label: "Developer Profile" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

export async function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  const user = await requireUser();
  if (!user.profileCompleted) redirect("/profile/complete");
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  const items = user.role === "ADMIN" ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950/80 lg:border-b-0 lg:border-r">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="block">
            <div className="text-lg font-semibold tracking-tight">TesterBridge</div>
            <div className="text-[11px] text-slate-400">Developer-to-developer app testing network</div>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {isDemoMode() ? (
              <p className="text-xs text-amber-200">DEMO MODE — no production APIs are called.</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <Link href="/activity" className="text-sm text-slate-300">
              Alerts{unread ? ` (${unread})` : ""}
            </Link>
            <span className="text-sm text-slate-400">{user.developerName || user.name || "Developer"}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-400 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
