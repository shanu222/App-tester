import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/discovery", label: "Tester Discovery" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/testers", label: "Testers" },
  { href: "/apps", label: "My Apps" },
  { href: "/integrations", label: "Integrations" },
  { href: "/messages", label: "Messages" },
  { href: "/feedback", label: "Feedback" },
  { href: "/activity", label: "Activity" },
  { href: "/analytics", label: "Analytics" },
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
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950/80 lg:border-b-0 lg:border-r">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="block">
            <div className="text-lg font-semibold tracking-tight">TesterBridge</div>
            <div className="text-[11px] text-slate-400">Find testers. Track every test.</div>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {NAV.map((item) => (
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
            <span className="text-sm text-slate-400">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-sm text-slate-400 hover:text-white">Logout</button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
