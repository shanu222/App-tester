import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsForms } from "@/components/settings/settings-forms";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const templates = await prisma.messageTemplate.findMany({ where: { userId: user.id, campaignId: null } });
  return (
    <AppShell title="Settings" description="Account details, rate limits, notifications, and data export.">
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
