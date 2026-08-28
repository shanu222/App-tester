import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsForms } from "@/components/settings/settings-forms";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const templates = await prisma.messageTemplate.findMany({ where: { userId: user.id, campaignId: null } });
  return (
    <AppShell title="Settings">
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/integrations" className="rounded-full border border-line px-3 py-1.5 text-slate-600 hover:border-line-strong">
          Integrations
        </Link>
        <Link href="/analytics" className="rounded-full border border-line px-3 py-1.5 text-slate-600 hover:border-line-strong">
          Analytics
        </Link>
        <Link href="/activity" className="rounded-full border border-line px-3 py-1.5 text-slate-600 hover:border-line-strong">
          Alerts
        </Link>
      </div>
      <SettingsForms
        user={{
          name: user.name || "",
          email: user.email,
          developerName: user.developerName || "",
          company: user.company || "",
        }}
        settings={{
          commentsPerHour: settings?.commentsPerHour ?? 3,
          commentsPerDay: settings?.commentsPerDay ?? 8,
          processedPostsPerDay: settings?.processedPostsPerDay ?? 40,
          messagesPerDay: settings?.messagesPerDay ?? 15,
          requireCommentApproval: settings?.requireCommentApproval ?? true,
          allowAutomatedEmail: settings?.allowAutomatedEmail ?? false,
          notifyOpportunities: settings?.notifyOpportunities ?? true,
          notifyReplies: settings?.notifyReplies ?? true,
          notifyTesters: settings?.notifyTesters ?? true,
          notifyIntegrations: settings?.notifyIntegrations ?? true,
          notifyFeedback: settings?.notifyFeedback ?? true,
          playClosedTestTarget: settings?.playClosedTestTarget ?? 12,
          playClosedTestDays: settings?.playClosedTestDays ?? 14,
          defaultKeywords: (settings?.defaultKeywords || []).join("\n"),
        }}
        templates={templates.map((item) => ({ key: item.key, name: item.name, body: item.body }))}
      />
    </AppShell>
  );
}
