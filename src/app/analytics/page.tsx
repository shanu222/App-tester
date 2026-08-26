import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getFunnel } from "@/lib/services/dashboard";
import { campaignStats } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";
import { percent } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const funnel = await getFunnel(user.id);
  const campaigns = await prisma.campaign.findMany({ where: { userId: user.id } });
  return (
    <AppShell title="Analytics">
      <h2 className="mb-3 font-medium">Conversion funnel</h2>
      <div className="space-y-2">
        {funnel.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className="w-40 text-xs uppercase text-slate-400">{step.key}</div>
            <div className="h-8 flex-1 rounded-lg bg-slate-900">
              <div
                className="h-8 rounded-lg bg-teal-500/40"
                style={{ width: `${Math.max(8, percent(step.value, funnel[0]?.value || 1))}%` }}
              />
            </div>
            <div className="w-10 text-right text-sm">{step.value}</div>
            {index < funnel.length - 1 ? <span className="text-slate-600">↓</span> : null}
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-10 font-medium">Campaign analytics</h2>
      <div className="space-y-3">
        {await Promise.all(
          campaigns.map(async (campaign) => {
            const stats = await campaignStats(user.id, campaign.id);
            return (
              <div key={campaign.id} className="rounded-2xl border border-slate-800 p-4 text-sm">
                <div className="font-medium">{campaign.name}</div>
                <p className="text-slate-400">
                  {campaign.targetTesters} target · {stats.optedIn} opted in ·{" "}
                  {percent(stats.optedIn, campaign.targetTesters)}% · {Math.max(0, campaign.targetTesters - stats.optedIn)} remaining
                </p>
              </div>
            );
          }),
        )}
      </div>
    </AppShell>
  );
}
