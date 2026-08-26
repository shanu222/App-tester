import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { JsonButton } from "@/components/ui/json-button";

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
      actions={<JsonButton url="/api/notifications" label="Mark notifications read" variant="ghost" />}
    >
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Notifications</h2>
      <div className="mb-8 space-y-2">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" body="Alerts about tests, messages, and integrations appear here." />
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 px-4 py-3 text-sm">
              <div className="font-medium">{item.title}</div>
              <div className="text-slate-400">{item.body}</div>
            </div>
          ))
        )}
      </div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Audit log</h2>
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" body="Campaign and testing actions you take are recorded here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Timestamp</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-400">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.campaign?.name || "—"}</td>
                  <td className="px-3 py-2">{log.result || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
