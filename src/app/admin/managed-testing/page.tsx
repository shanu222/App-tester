import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/auth";
import { adminListManagedTesting } from "@/lib/services/managed-testing";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/card";
import { StatCard } from "@/components/ui/widgets";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { JsonButton } from "@/components/ui/json-button";
import { formatPkr } from "@/lib/managed-testing/catalog";
import { CAMPAIGN_STATUS_LABELS, PAYMENT_STATUS_LABELS, campaignStatusTone, paymentStatusTone } from "@/lib/managed-testing/labels";
import { AdminAddTesterForm } from "@/components/managed-testing/admin-add-tester-form";
import Link from "next/link";

export default async function AdminManagedTestingPage() {
  await requireAdmin();
  const data = await adminListManagedTesting();

  return (
    <AppShell title="Managed Testing" description="Package purchases, tester allocation, and campaign status.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={data.campaigns.length} />
        <StatCard label="Pending payments" value={data.pending} />
        <StatCard label="Testers in pool" value={data.testers} />
        <StatCard label="Available testers" value={data.available} />
      </div>

      <SectionLabel className="mb-3 mt-10">Add consenting tester</SectionLabel>
      <AdminAddTesterForm />

      <SectionLabel className="mb-3 mt-10">Payments</SectionLabel>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Developer</Th>
              <Th>Package</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Method</Th>
              <Th>Reference</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((payment) => (
              <Tr key={payment.publicId}>
                <Td>{payment.user.developerName || payment.user.name || payment.user.email}</Td>
                <Td>{payment.package.name}</Td>
                <Td>{formatPkr(payment.amountPkr)}</Td>
                <Td>
                  <Badge tone={paymentStatusTone(payment.status)}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                </Td>
                <Td>{payment.method?.replaceAll("_", " ") || "—"}</Td>
                <Td className="font-mono text-xs">{payment.developerReference || payment.transactionReference}</Td>
                <Td>
                  <Link className="text-sm font-medium text-brand hover:underline" href={`/admin/managed-testing/payments/${payment.publicId}`}>
                    Review
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <SectionLabel className="mb-3 mt-10">Campaigns</SectionLabel>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>App</Th>
              <Th>Developer</Th>
              <Th>Status</Th>
              <Th>Assigned</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((campaign) => (
              <Tr key={campaign.publicId}>
                <Td className="font-medium">{campaign.app?.name || "—"}</Td>
                <Td>{campaign.user.developerName || campaign.user.name || campaign.user.email}</Td>
                <Td>
                  <Badge tone={campaignStatusTone(campaign.status)}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
                </Td>
                <Td>
                  {campaign._count.assignments} / {campaign.testerTarget}
                </Td>
                <Td>
                  {campaign.status === "ACTIVE" && campaign._count.assignments < campaign.testerTarget ? (
                    <JsonButton
                      url="/api/admin/managed-testing"
                      body={{ action: "allocate", campaignPublicId: campaign.publicId }}
                      label="Allocate testers"
                    />
                  ) : (
                    <Link className="text-sm font-medium text-brand hover:underline" href={`/managed-testing/${campaign.publicId}`}>
                      Open
                    </Link>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </AppShell>
  );
}
