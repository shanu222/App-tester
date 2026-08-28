import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { listInbox } from "@/lib/services/inbox";

export default async function ActivityPage() {
  const user = await requireUser();
  const [logs, inbox] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: user.id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    listInbox(user.id),
  ]);
  return (
    <AppShell title="Notifications">
      <SectionLabel className="mb-3">Notifications</SectionLabel>
      <div className="mb-10">
        <NotificationInbox initial={inbox.notifications} />
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
