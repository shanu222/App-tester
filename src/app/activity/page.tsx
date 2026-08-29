import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { SectionLabel } from "@/components/ui/card";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { AuditLogTable } from "@/components/activity/audit-log-table";
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
      <AuditLogTable
        logs={logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          action: log.action,
          campaignName: log.campaign?.name || null,
          result: log.result,
        }))}
      />
    </AppShell>
  );
}
