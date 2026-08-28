import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getManagedCampaignForUser } from "@/lib/services/managed-testing";
import { StartCampaignButton } from "@/components/managed-testing/start-campaign-button";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { redirect } from "next/navigation";
import { testingTypeLabel } from "@/lib/campaign-autofill";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ManagedCampaignConfirmPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireUser();
  const { publicId } = await params;
  const campaign = await getManagedCampaignForUser(user.id, publicId);
  if (campaign.status === "ACTIVE" || campaign.status === "COMPLETED") {
    redirect(`/managed-testing/${publicId}`);
  }
  if (!campaign.app) redirect(`/managed-testing/${publicId}/setup`);

  return (
    <AppShell title="Ready to start?" description="Review the campaign before TestLoop invites consenting testers.">
      <Card className="max-w-xl">
        <CardHeader title={campaign.app.name} />
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Testing type</dt>
            <dd>
              <TestingTypeBadge type={campaign.testingType} />
              <span className="sr-only">{testingTypeLabel(campaign.testingType)}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Managed testers</dt>
            <dd className="font-medium text-slate-900">{campaign.testerCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Testing duration</dt>
            <dd className="font-medium text-slate-900">{campaign.durationDays} days</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm leading-6 text-slate-700">The system will:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>invite consenting testers</li>
          <li>coordinate testing</li>
          <li>track responses</li>
          <li>send reminders</li>
          <li>provide progress reports</li>
        </ul>
        <div className="mt-6">
          <StartCampaignButton publicId={publicId} />
        </div>
        <div className="mt-4">
          <Link href={`/managed-testing/${publicId}/setup`}>
            <Button variant="ghost">Edit campaign</Button>
          </Link>
        </div>
        <ManagedTestingNotice className="mt-6 flex items-start gap-1 text-sm leading-6 text-muted" />
      </Card>
    </AppShell>
  );
}
