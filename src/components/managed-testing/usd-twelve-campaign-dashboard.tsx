import { AppShell } from "@/components/layout/app-shell";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { StatCard } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { campaignStatusTone } from "@/lib/managed-testing/labels";
import { paymentIsActivated } from "@/lib/managed-testing/methods";
import { usdTwelveProgressStatus } from "@/lib/managed-testing/usd-twelve";
import type { ManagedAssignmentStatus, ManagedCampaignStatus, ManagedPaymentStatus } from "@prisma/client";

type CampaignView = {
  publicId: string;
  status: ManagedCampaignStatus;
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  testerTarget: number;
  durationDays: number;
  packageName: string;
  paymentStatus: ManagedPaymentStatus;
  amountLabel: string;
  app: { name: string; iconUrl: string | null } | null;
  progress: { day: number; durationDays: number };
  stats: { assigned: number; invitationsSent: number; confirmed: number; pending: number };
  testers: Array<{
    publicId: string;
    label: string;
    invitationStatus: string;
    confirmationStatus: string;
    testingStatus: ManagedAssignmentStatus;
    hasScreenshot: boolean;
  }>;
};

export function UsdTwelveCampaignDashboard({ campaign }: { campaign: CampaignView }) {
  const completed = campaign.status === "COMPLETED";
  const testingLabel = completed ? "TEST COMPLETED" : campaign.status === "ACTIVE" ? "ACTIVE" : campaign.status;
  const confirmed = campaign.stats.confirmed;
  const pending = Math.max(0, 12 - confirmed);

  const paymentConfirmed = paymentIsActivated(campaign.paymentStatus);
  const packageActive = campaign.status === "ACTIVE" || campaign.status === "COMPLETED";
  const testersInvited = campaign.stats.invitationsSent >= campaign.testerTarget;
  const steps = [
    { label: "Payment Confirmed", done: paymentConfirmed },
    { label: "Testing Package Active", done: packageActive },
    { label: "12 Testers Invited", done: testersInvited },
  ];

  return (
    <AppShell title="Managed Testing" description="12 Testers / 14 Days · tester coordination and testing evidence">
      {completed ? (
        <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Testing Completed
        </p>
      ) : null}

      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.label}
            className={
              step.done
                ? "rounded-card border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800"
                : "rounded-card border border-line bg-white px-3 py-2.5 text-sm text-muted"
            }
          >
            {step.done ? "✓ " : "○ "}
            {step.label}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-900">{campaign.app?.name || "Campaign"}</h2>
        <TestingTypeBadge type={campaign.testingType} />
        <Badge tone={campaignStatusTone(campaign.status)}>{testingLabel}</Badge>
        <Badge tone="good">{paymentConfirmed ? "Payment Confirmed" : campaign.paymentStatus}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        App: {campaign.app?.name || "—"} · Package: 12 Testers / 14 Days · Payment:{" "}
        {paymentConfirmed ? "Payment Confirmed" : "Payment Under Review"} · Testing: {testingLabel}
      </p>
      <p className="mt-1 text-sm text-muted">
        Day {campaign.progress.day} of {campaign.progress.durationDays}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Testers" value={12} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Invitations sent" value={campaign.stats.invitationsSent} />
      </div>

      <TableWrap className="mt-8">
        <Table>
          <thead>
            <tr>
              <Th>Tester</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {campaign.testers.map((row) => (
              <Tr key={row.publicId}>
                <Td className="font-medium">{row.label}</Td>
                <Td>
                  {usdTwelveProgressStatus({
                    invitationStatus: row.invitationStatus,
                    confirmationStatus: row.confirmationStatus,
                    hasScreenshot: row.hasScreenshot,
                  })}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <p className="mt-3 text-xs text-muted">
        “Tester confirmed testing” means the tester reported participation on TestLoop. It is not a Google Play
        verified installation.
      </p>
      <ManagedTestingNotice className="mt-8 flex items-start gap-1 text-sm leading-6 text-muted" />
    </AppShell>
  );
}
