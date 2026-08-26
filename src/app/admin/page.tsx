import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { JsonButton } from "@/components/ui/json-button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function AdminPage() {
  await requireAdmin();
  const [developers, apps, campaigns, participations, reports, users, playHealth, jobs] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.app.count(),
    prisma.campaign.count(),
    prisma.testingParticipation.count(),
    prisma.developerReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { author: { select: { name: true, developerName: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        name: true,
        developerName: true,
        email: true,
        role: true,
        profileCompleted: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { apps: true, campaigns: true } },
      },
    }),
    prisma.integration.groupBy({
      by: ["status"],
      where: { provider: "GOOGLE_PLAY" },
      _count: true,
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, type: true, status: true, lastError: true, createdAt: true },
    }),
  ]);

  return (
    <AppShell title="Admin">
      <p className="mb-6 text-sm text-slate-400">
        Platform operators cannot see Google passwords or decrypted Play credentials from this screen.
      </p>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 p-4">Developers {developers}</div>
        <div className="rounded-2xl border border-slate-800 p-4">Apps {apps}</div>
        <div className="rounded-2xl border border-slate-800 p-4">Campaigns {campaigns}</div>
        <div className="rounded-2xl border border-slate-800 p-4">Participations {participations}</div>
      </div>
      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-400">Google Play integration health</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        {playHealth.map((row) => (
          <Badge key={row.status}>
            {row.status}: {row._count}
          </Badge>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-400">Developers</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/80 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Apps</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="px-4 py-3">{item.developerName || item.name}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item._count.apps}</td>
                <td className="px-4 py-3">{item.suspendedAt ? "Suspended" : "Active"}</td>
                <td className="px-4 py-3">
                  <JsonButton
                    url="/api/admin"
                    body={{ userId: item.id, action: item.suspendedAt ? "restore" : "suspend" }}
                    label={item.suspendedAt ? "Restore" : "Suspend"}
                    variant={item.suspendedAt ? "secondary" : "danger"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-400">Reports</h2>
      <div className="space-y-2 text-sm">
        {reports.map((report) => (
          <div key={report.id} className="rounded-xl border border-slate-800 p-4">
            {report.reason} · {report.author.developerName || report.author.name} · {formatDateTime(report.createdAt)}
            {report.details ? <p className="mt-1 text-slate-400">{report.details}</p> : null}
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-400">Recent jobs</h2>
      <div className="space-y-2 text-sm">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-slate-800 p-3">
            {job.type} · {job.status}
            {job.lastError ? <span className="text-rose-300"> · {job.lastError}</span> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
