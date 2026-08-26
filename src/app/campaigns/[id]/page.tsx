import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { campaignStats, getCampaign } from "@/lib/services/campaigns";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/widgets";
import { JsonButton } from "@/components/ui/json-button";
import { percent } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/widgets";
import Link from "next/link";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";
import { ManualTesterForm } from "@/components/testers/manual-tester-form";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  const stats = await campaignStats(user.id, id);
  const remaining = Math.max(0, campaign.targetTesters - stats.optedIn);

  return (
    <AppShell
      title={campaign.name}
      actions={
        <div className="flex gap-2">
          {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "ACTIVE" }} label="Start" />
          ) : null}
          {campaign.status === "ACTIVE" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "PAUSED" }} label="Pause" variant="secondary" />
          ) : null}
          {campaign.status === "ACTIVE" || campaign.status === "PAUSED" ? (
            <JsonButton url="/api/campaigns" method="PATCH" body={{ id, status: "COMPLETED" }} label="Complete" variant="ghost" />
          ) : null}
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={campaign.status === "ACTIVE" ? "good" : "neutral"}>{campaign.status}</Badge>
        <span className="text-sm text-slate-400">
          {campaign.app.name} · {campaign.testingType} · Target {campaign.targetTesters}
        </span>
        <span className="text-sm text-slate-300">
          Progress {stats.optedIn} / {campaign.targetTesters} ({percent(stats.optedIn, campaign.targetTesters)}%)
        </span>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 p-4 text-sm text-slate-300">
        Required testers: {campaign.requiredTesters} · Opted in: {stats.optedIn} · Remaining: {remaining} ·
        Days active window: {campaign.requiredActiveDays} (configurable). Based on recorded tester activity —
        verify official Play Console status before applying for production access. TesterBridge does not determine
        Google&apos;s eligibility.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Target" value={campaign.targetTesters} />
        <StatCard label="Opportunities" value={stats.opportunities} />
        <StatCard label="Replies" value={stats.replies} />
        <StatCard label="Gmail addresses" value={stats.emails} />
        <StatCard label="Added" value={stats.added} />
        <StatCard label="Opted in" value={stats.optedIn} />
        <StatCard label="Testing" value={stats.testing} />
        <StatCard label="Feedback" value={stats.feedback} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 p-5">
          <h2 className="font-medium">Testing links</h2>
          <p className="mt-2 text-sm text-slate-400">
            {campaign.webOptInUrl || "No testing link configured — do not invent one."}
          </p>
          {campaign.webOptInUrl ? (
            <div className="mt-3 flex gap-3 text-sm">
              <a className="text-teal-300" href={campaign.webOptInUrl} target="_blank" rel="noreferrer">
                Open testing link
              </a>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            In-app telemetry token: {campaign.telemetryToken} · POST /api/telemetry
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 p-5">
          <h2 className="font-medium">Manual override</h2>
          <ManualTesterForm campaignId={campaign.id} />
          <div className="mt-4">
            <PasteReplyForm campaignId={campaign.id} />
          </div>
        </div>
      </div>

      <h2 className="mt-10 mb-3 font-medium">Testers</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Opt-in</th>
              <th className="px-4 py-3">Testing</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaign.testerCampaigns.map((row) => (
              <tr key={row.id} className="border-t border-slate-800">
                <td className="px-4 py-3">
                  <Link className="text-sky-300" href={`/testers/${row.testerId}`}>
                    {row.tester.name || "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.detectedEmail || row.tester.email || "—"}</td>
                <td className="px-4 py-3">{row.accessAdded ? "✅ Added" : "—"}</td>
                <td className="px-4 py-3">{row.optedIn ? "✅ Opted in" : "⏳ Pending"}</td>
                <td className="px-4 py-3">
                  {["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status)
                    ? "Activity detected"
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
