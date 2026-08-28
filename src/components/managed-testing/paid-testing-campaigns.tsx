import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { JsonButton } from "@/components/ui/json-button";
import { CAMPAIGN_STATUS_LABELS, PAYMENT_STATUS_LABELS, campaignStatusTone, paymentStatusTone } from "@/lib/managed-testing/labels";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { listUsdTwelveAdminCampaigns } from "@/lib/services/usd-twelve-package";
import type { ManagedCampaignStatus, ManagedPaymentStatus } from "@prisma/client";
import Link from "next/link";

type Campaign = Awaited<ReturnType<typeof listUsdTwelveAdminCampaigns>>[number];

export function PaidTestingCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="mt-12">
      <SectionLabel className="mb-3">Paid Testing Campaigns</SectionLabel>
      {campaigns.length === 0 ? (
        <p className="text-sm text-muted">No $10 / 12-tester / 14-day campaigns yet.</p>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <article key={campaign.publicId} className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{campaign.appName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {campaign.developerName} · {campaign.developerEmail}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={campaignStatusTone(campaign.status as ManagedCampaignStatus)}>
                    {campaign.status === "COMPLETED" ? "TEST COMPLETED" : CAMPAIGN_STATUS_LABELS[campaign.status as ManagedCampaignStatus]}
                  </Badge>
                  <Badge tone={paymentStatusTone(campaign.paymentStatus as ManagedPaymentStatus)}>
                    {PAYMENT_STATUS_LABELS[campaign.paymentStatus as ManagedPaymentStatus] || campaign.paymentStatus}
                  </Badge>
                  {campaign.stats.allConfirmed ? (
                    <Badge tone="good">12/12 TESTERS CONFIRMED</Badge>
                  ) : null}
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted">Amount</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{campaign.amountLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted">Purchase date</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(campaign.purchaseDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Start / end</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Days remaining</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{campaign.status === "ACTIVE" ? campaign.daysRemaining : 0}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-slate-700">
                Tester progress: {campaign.stats.total} Total · {campaign.stats.invited} Invitations Sent ·{" "}
                {campaign.stats.confirmed} Confirmed · {campaign.stats.pending} Pending
              </p>
              <TableWrap className="mt-4">
                <Table>
                  <thead>
                    <tr>
                      <Th>Tester</Th>
                      <Th>Email</Th>
                      <Th>Invitation</Th>
                      <Th>Confirmation</Th>
                      <Th>Confirmed</Th>
                      <Th>Screenshot</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.testers.map((tester) => (
                      <Tr key={tester.publicId}>
                        <Td>{tester.label}</Td>
                        <Td className="font-mono text-xs">{tester.email}</Td>
                        <Td>{tester.invitationStatus === "FAILED" ? "EMAIL_FAILED" : tester.invitationStatus}</Td>
                        <Td>
                          {tester.confirmationStatus === "CONFIRMED" ? "Tester confirmed testing" : "Pending"}
                        </Td>
                        <Td>{formatDateTime(tester.confirmedAt)}</Td>
                        <Td>
                          {tester.hasScreenshot ? (
                            <a
                              className="text-sm font-medium text-brand hover:underline"
                              href={`/api/admin/managed-testing/screenshots/${tester.publicId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            "None"
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <div className="mt-4 flex flex-wrap gap-2">
                {campaign.testers.some((tester) => tester.invitationStatus === "FAILED") ? (
                  <JsonButton
                    url="/api/admin/managed-testing"
                    body={{ action: "retry-usd-invites", campaignPublicId: campaign.publicId }}
                    label="Retry failed invites"
                    variant="secondary"
                  />
                ) : null}
                {campaign.status === "DRAFT" ? (
                  <JsonButton
                    url="/api/admin/managed-testing"
                    body={{ action: "fulfill-usd-twelve", campaignPublicId: campaign.publicId }}
                    label="Activate campaign"
                    variant="secondary"
                  />
                ) : null}
                <a
                  className="inline-flex h-9.5 items-center rounded-control border border-line-strong bg-white px-4 text-sm font-medium text-slate-700 shadow-card hover:bg-surface"
                  href={`/api/admin/managed-testing/usd-twelve?campaign=${encodeURIComponent(campaign.publicId)}&export=csv`}
                >
                  Download evidence report
                </a>
                <Link className="text-sm font-medium text-brand hover:underline" href={`/managed-testing/${campaign.publicId}`}>
                  Open campaign
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
