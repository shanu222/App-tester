import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { JsonButton } from "@/components/ui/json-button";
import { SectionLabel } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Bell } from "lucide-react";

export default async function ActivityPage() {
  const user = await requireUser();
  const logs = await prisma.activityLog.findMany({
    where: { userId: user.id },
    include: { campaign: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <AppShell
      title="Activity"
      description="Notifications and a full audit trail of your testing actions."
      actions={<JsonButton url="/api/notifications" label="Mark all read" variant="secondary" />}
    >
      <SectionLabel className="mb-3">Notifications</SectionLabel>
      <div className="mb-10 space-y-2.5">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-4.5 w-4.5" aria-hidden />}
            title="No notifications"
            body="Alerts about tests, messages, and integrations appear here."
          />
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-card border border-line bg-white px-4 py-3.5 shadow-card"
            >
              <span
                className={
                  item.readAt
                    ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong"
                    : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                }
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                <div className="mt-0.5 text-sm leading-6 text-muted">{item.body}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <SectionLabel className="mb-3">Audit log</SectionLabel>
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" body="Campaign and testing actions you take are recorded here." />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Action</Th>
                <Th>Campaign</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Tr key={log.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(log.createdAt)}</Td>
                  <Td className="font-medium text-slate-900">{log.action}</Td>
                  <Td>{log.campaign?.name || "—"}</Td>
                  <Td className="text-muted">{log.result || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AppShell>
  );
}
