import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getManagedCampaignForUser } from "@/lib/services/managed-testing";
import { CampaignDashboardActions } from "@/components/managed-testing/campaign-dashboard-actions";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { StatCard } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { campaignStatusTone, CAMPAIGN_STATUS_LABELS } from "@/lib/managed-testing/labels";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function ManagedCampaignDashboardPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireUser();
  const { publicId } = await params;
  const campaign = await getManagedCampaignForUser(user.id, publicId);
  if (campaign.status === "DRAFT") redirect(`/managed-testing/${publicId}/setup`);
  if (campaign.status === "READY") redirect(`/managed-testing/${publicId}/confirm`);

  const pct = campaign.testerTarget
    ? Math.min(100, Math.round((campaign.stats.confirmed / campaign.testerTarget) * 100))
    : 0;

  return (
    <AppShell
      title="Managed testing dashboard"
      description={campaign.app?.name || "Managed Beta Testing"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-900">{campaign.app?.name || "Campaign"}</h2>
        <TestingTypeBadge type={campaign.testingType} />
        <Badge tone={campaignStatusTone(campaign.status)}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Testing: {campaign.testingType === "OPEN" ? "Open" : campaign.testingType === "INTERNAL" ? "Internal" : "Closed"}{" "}
        testing · Day {campaign.progress.day} / {campaign.progress.durationDays}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Testers assigned" value={campaign.stats.assigned} />
        <StatCard label="Invitations sent" value={campaign.stats.invitationsSent} />
        <StatCard label="Opted in" value={campaign.stats.optedIn} />
        <StatCard label="Confirmed" value={campaign.stats.confirmed} />
        <StatCard label="Pending" value={campaign.stats.pending} />
      </div>
      {campaign.stats.recruiting > 0 ? (
        <p className="mt-3 text-sm text-amber-800">
          {campaign.stats.recruiting} more consenting tester{campaign.stats.recruiting === 1 ? "" : "s"} still being
          matched to this campaign.
        </p>
      ) : null}

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">{pct}% confirmed against the purchased tester count</p>
      </div>

      <ol className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {campaign.timeline.map((item) => (
          <li
            key={item.label}
            className={cn(
              "rounded-card border px-3 py-2.5 text-sm",
              item.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-white text-muted",
            )}
          >
            {item.done ? "✓ " : "○ "}
            {item.label}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <CampaignDashboardActions
          publicId={publicId}
          testers={campaign.testers}
          reportEmailEnabled={campaign.reportEmailEnabled}
          reportFrequency={campaign.reportFrequency}
          reportTime={campaign.reportTime}
          reportTimezone={campaign.reportTimezone}
          whatsappNumber={campaign.whatsappNumber}
          whatsappAvailable={campaign.whatsappAvailable}
        />
      </div>
      <ManagedTestingNotice className="mt-8 flex items-start gap-1 text-sm leading-6 text-muted" />
    </AppShell>
  );
}
