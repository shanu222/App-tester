import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getFunnel } from "@/lib/services/dashboard";
import { campaignStats } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { percent } from "@/lib/utils";
import { EmptyState } from "@/components/ui/widgets";
import { SectionLabel } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const funnel = await getFunnel(user.id);
  const campaigns = await prisma.campaign.findMany({ where: { userId: user.id } });
  const top = funnel[0]?.value || 0;

  return (
    <AppShell title="Analytics" description="Conversion and campaign performance from real tester activity.">
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <SectionLabel>Conversion funnel</SectionLabel>

        {top === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No tester activity recorded yet. Numbers appear once developers accept your requests.
          </p>
        ) : (
          <div className="mt-5 space-y-3.5">
            {funnel.map((step) => {
              const share = percent(step.value, top || 1);
              return (
                <div key={step.key} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto] sm:gap-4">
                  <div className="truncate text-[13px] font-medium capitalize text-slate-700">
                    {step.key.replaceAll("_", " ").toLowerCase()}
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-surface-strong"
                    role="progressbar"
                    aria-label={step.key}
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="block h-full rounded-full bg-brand transition-[width] duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                    />
                  </div>
                  <div className="flex items-baseline gap-1.5 text-right">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{step.value}</span>
                    <span className="w-10 text-xs text-muted tabular-nums">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SectionLabel className="mb-3 mt-10">Campaign analytics</SectionLabel>
      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaign analytics yet"
          body="Publish a testing request to start recording tester activity for that campaign."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {await Promise.all(
            campaigns.map(async (campaign) => {
              const stats = await campaignStats(user.id, campaign.id);
              const share = percent(stats.optedIn, campaign.targetTesters);
              const remaining = Math.max(0, campaign.targetTesters - stats.optedIn);

              return (
                <div key={campaign.id} className="rounded-card border border-line bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="truncate font-medium text-slate-900">{campaign.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{share}%</span>
                  </div>

                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong"
                    role="progressbar"
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div>
                      <dt className="text-xs text-muted">Target</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                        {campaign.targetTesters}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Opted in</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                        {stats.optedIn}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Remaining</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{remaining}</dd>
                    </div>
                  </dl>
                </div>
              );
            }),
          )}
        </div>
      )}
    </AppShell>
  );
}
