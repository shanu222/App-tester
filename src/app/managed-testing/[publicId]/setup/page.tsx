import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getManagedCampaignForUser, listSelectableApps } from "@/lib/services/managed-testing";
import { CampaignSetupForm } from "@/components/managed-testing/campaign-setup-form";
import { Card, CardHeader } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { paymentIsActivated } from "@/lib/managed-testing/methods";

export default async function ManagedCampaignSetupPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireUser();
  const { publicId } = await params;
  const [campaign, apps] = await Promise.all([
    getManagedCampaignForUser(user.id, publicId),
    listSelectableApps(user.id),
  ]);
  if (!paymentIsActivated(campaign.paymentStatus)) redirect(`/managed-testing/payments/${campaign.paymentPublicId}`);
  if (campaign.status === "ACTIVE" || campaign.status === "COMPLETED") {
    redirect(`/managed-testing/${publicId}`);
  }

  return (
    <AppShell title="Create testing campaign" description="Select the app and testing type for this managed package.">
      <Card className="max-w-xl">
        <CardHeader
          title={`${campaign.testerCount} managed testers`}
          description={`${campaign.packageName} · ${campaign.amountLabel}`}
        />
        <div className="mt-6">
          <CampaignSetupForm
            publicId={publicId}
            apps={apps}
            initial={{
              testingType: campaign.testingType,
              testingUrl: campaign.testingUrl,
              testingInstructions: campaign.testingInstructions,
            }}
          />
        </div>
      </Card>
    </AppShell>
  );
}
