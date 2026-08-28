import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listDeveloperManagedCampaigns, listDeveloperPayments, listManagedPackages } from "@/lib/services/managed-testing";
import { PaymentsPackagesPanel } from "@/components/managed-testing/payments-packages-panel";
import { PackageCards } from "@/components/managed-testing/package-cards";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { CardHeader, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/widgets";
import { campaignStatusTone, CAMPAIGN_STATUS_LABELS, paymentStatusTone, PAYMENT_STATUS_LABELS } from "@/lib/managed-testing/labels";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import Link from "next/link";

export default async function ManagedTestingPage() {
  const user = await requireUser();
  const [packages, workspace, billing] = await Promise.all([
    listManagedPackages(),
    listDeveloperManagedCampaigns(user.id),
    listDeveloperPayments(user.id),
  ]);

  return (
    <AppShell
      title="Managed Beta Testing"
      description="Purchase a tester package, then TestLoop coordinates consenting testing participants for your app."
    >
      <ManagedTestingNotice />

      <div className="mt-6">
        <PaymentsPackagesPanel
          payments={billing.payments}
          activePackage={billing.activePackage}
          allocation={billing.allocation}
        />
      </div>

      {workspace.pendingPayments.length > 0 ? (
        <div className="mt-6 space-y-3">
          <SectionLabel>Pending payments</SectionLabel>
          {workspace.pendingPayments.map((payment) => (
            <Link
              key={payment.publicId}
              href={`/managed-testing/payments/${payment.publicId}`}
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card hover:border-line-strong"
            >
              <div>
                <p className="font-medium text-slate-900">{payment.package.name}</p>
                <p className="text-sm text-muted">{payment.transactionReference}</p>
              </div>
              <Badge tone={paymentStatusTone(payment.status)}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {workspace.campaigns.length > 0 ? (
        <div className="mt-8">
          <SectionLabel className="mb-3">Your campaigns</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.campaigns.map((campaign) => {
              const href =
                campaign.status === "DRAFT"
                  ? `/managed-testing/${campaign.publicId}/setup`
                  : campaign.status === "READY"
                    ? `/managed-testing/${campaign.publicId}/confirm`
                    : `/managed-testing/${campaign.publicId}`;
              return (
                <Link
                  key={campaign.publicId}
                  href={href}
                  className="rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{campaign.app?.name || "Select an app"}</p>
                      <p className="mt-1 text-sm text-muted">
                        {campaign.payment.package.name} · {campaign._count.assignments} testers assigned
                      </p>
                    </div>
                    <Badge tone={campaignStatusTone(campaign.status)}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
                  </div>
                  <div className="mt-3">
                    <TestingTypeBadge type={campaign.testingType} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <CardHeader
          title="Choose a tester package"
          description="Managed testers are real people who have consented to participate. Outcomes on Google Play are not guaranteed."
        />
        <div className="mt-5">
          {packages.length === 0 ? (
            <EmptyState title="Packages unavailable" body="Managed testing packages are not listed yet." />
          ) : (
            <PackageCards packages={packages} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
