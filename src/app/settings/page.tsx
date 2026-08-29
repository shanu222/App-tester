import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsForms } from "@/components/settings/settings-forms";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { DeleteAccountCard } from "@/components/settings/delete-account";
import { getNotificationSettings } from "@/lib/services/notifications";
import { listDeveloperPayments } from "@/lib/services/managed-testing";
import { PaymentsPackagesPanel } from "@/components/managed-testing/payments-packages-panel";
import { CompanyAboutBlurb } from "@/components/brand/company-attribution";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const templates = await prisma.messageTemplate.findMany({ where: { userId: user.id, campaignId: null } });
  const notifications = await getNotificationSettings(user.id);
  const billing = await listDeveloperPayments(user.id);
  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <Suspense fallback={null}>
          <NotificationsForm initial={notifications} />
        </Suspense>
        <PaymentsPackagesPanel
          payments={billing.payments}
          activePackage={billing.activePackage}
          allocation={billing.allocation}
        />
        <Card>
          <CardHeader
            title="Google Play"
            description="Connection, synchronization, and disconnect live on the Google Play page."
            action={
              <Link href="/play">
                <Button variant="secondary" size="sm">
                  Open Google Play
                </Button>
              </Link>
            }
          />
        </Card>
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
        <DeleteAccountCard />
        <CompanyAboutBlurb />
      </div>
    </AppShell>
  );
}
