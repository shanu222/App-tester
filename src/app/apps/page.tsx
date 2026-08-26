import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import Link from "next/link";
import { CreateAppForm } from "@/components/apps/create-app-form";
import { JsonButton } from "@/components/ui/json-button";

export default async function AppsPage() {
  const user = await requireUser();
  const apps = await prisma.app.findMany({
    where: { userId: user.id },
    include: { tracks: true, campaigns: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell
      title="My Apps"
      actions={<JsonButton url="/api/google/play/apps" label="Sync my apps" variant="secondary" />}
    >
      <CreateAppForm />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {apps.length === 0 ? (
          <EmptyState
            title="No apps"
            body="The Play Publishing API cannot list every app by itself. Sync via Play Developer Reporting if connected, or add a package name manually."
          />
        ) : (
          apps.map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="font-medium">{app.name}</div>
              <div className="text-sm text-slate-400">{app.packageName}</div>
              <div className="mt-2 text-xs text-slate-500">
                {app.testingType} · {app.tracks.length} tracks · {app.campaigns.length} campaigns
                {app.syncedFromPlay ? " · synced from Play" : " · manual"}
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
