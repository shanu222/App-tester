import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { JsonButton } from "@/components/ui/json-button";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/card";
import { EmptyState, StatCard } from "@/components/ui/widgets";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
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
    <AppShell
      title="Admin"
      description="Platform operators cannot see Google passwords or decrypted Play credentials."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Developers" value={developers} />
        <StatCard label="Apps" value={apps} />
        <StatCard label="Campaigns" value={campaigns} />
        <StatCard label="Participations" value={participations} />
      </div>

      <SectionLabel className="mb-3 mt-10">Google Play integration health</SectionLabel>
      {playHealth.length === 0 ? (
        <p className="text-sm text-muted">No Google Play integrations yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {playHealth.map((row) => (
            <Badge
              key={row.status}
              tone={row.status === "CONNECTED" ? "good" : row.status === "ERROR" ? "bad" : "neutral"}
            >
              {row.status.replaceAll("_", " ")}: {row._count}
            </Badge>
          ))}
        </div>
      )}

      <SectionLabel className="mb-3 mt-10">Developers</SectionLabel>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th className="text-right">Apps</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <Tr key={item.id}>
                <Td className="font-medium text-slate-900">{item.developerName || item.name}</Td>
                <Td className="text-muted">{item.email}</Td>
                <Td className="text-right tabular-nums">{item._count.apps}</Td>
                <Td>
                  <Badge tone={item.suspendedAt ? "bad" : "good"}>
                    {item.suspendedAt ? "Suspended" : "Active"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <JsonButton
                    url="/api/admin"
                    body={{ userId: item.id, action: item.suspendedAt ? "restore" : "suspend" }}
                    label={item.suspendedAt ? "Restore" : "Suspend"}
                    variant={item.suspendedAt ? "secondary" : "danger"}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <SectionLabel className="mb-3 mt-10">Reports</SectionLabel>
      {reports.length === 0 ? (
        <EmptyState title="No reports" body="Developer reports submitted for review appear here." />
      ) : (
        <div className="space-y-2.5">
          {reports.map((report) => (
            <div key={report.id} className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-slate-900">{report.reason}</span>
                <span className="text-muted">
                  · {report.author.developerName || report.author.name} ·{" "}
                  {formatDateTime(report.createdAt)}
                </span>
              </div>
              {report.details ? (
                <p className="mt-1.5 text-sm leading-6 text-muted">{report.details}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <SectionLabel className="mb-3 mt-10">Recent jobs</SectionLabel>
      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet" body="Background jobs run when integrations sync tester access." />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Last error</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <Tr key={job.id}>
                  <Td className="font-medium text-slate-900">{job.type}</Td>
                  <Td>
                    <Badge
                      tone={
                        job.status === "SUCCEEDED"
                          ? "good"
                          : job.status === "FAILED" || job.status === "CANCELLED"
                            ? "bad"
                            : "warn"
                      }
                    >
                      {job.status}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(job.createdAt)}</Td>
                  <Td className="text-danger">{job.lastError || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AppShell>
  );
}
