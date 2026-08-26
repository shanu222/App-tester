import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPublicRequest } from "@/lib/services/network";
import { AcceptTestForm } from "@/components/network/accept-test-form";
import { JsonButton } from "@/components/ui/json-button";
import { Badge } from "@/components/ui/badge";
import { AppMark } from "@/components/brand/app-mark";
import { requestFillStatus } from "@/lib/request-status";
import Link from "next/link";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const request = await getPublicRequest(user.id, id);
  const fill = requestFillStatus(request.testersReceived, request.targetTesters);
  const pending = request.participation && !request.participation.consentAt;

  return (
    <AppShell title={request.app.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AppMark src={request.app.iconUrl} name={request.app.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={fill.tone}>{fill.label}</Badge>
            {pending ? <Badge tone="warn">Pending</Badge> : null}
            <Badge>Android · {request.testingType}</Badge>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Developer:{" "}
            <Link href={`/developers/${request.owner.id}`} className="text-emerald-300">
              {request.owner.name}
            </Link>
            {request.owner.country ? ` · ${request.owner.country}` : ""}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Testers {request.testersReceived} / {request.targetTesters} · {request.durationDays} days
            {request.reciprocalOpen ? " · Reciprocal open" : ""}
          </p>
        </div>
      </div>
      <p className="mt-6 max-w-3xl text-slate-300">
        {request.description || "This developer did not add a campaign description."}
      </p>
      {request.testingInstructions ? (
        <div className="mt-4 rounded-xl border border-slate-800 p-4 text-sm leading-6 text-slate-300">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Testing requirements</div>
          <p className="mt-2">{request.testingInstructions}</p>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">Google emails stay private until you confirm participation.</p>
      <div className="mt-6">
        {request.isOwner ? (
          <Link href={`/campaigns/${request.id}`} className="text-sm text-emerald-300">
            Manage your campaign
          </Link>
        ) : request.participation?.consentAt ? (
          <div className="rounded-xl border border-slate-800 p-5 text-sm">
            <div>Status: {request.participation.status.replaceAll("_", " ")}</div>
            {request.participation.lastError ? (
              <p className="mt-2 text-amber-200">{request.participation.lastError}</p>
            ) : null}
            <Link href="/testing" className="mt-3 inline-block text-emerald-300">
              Open My Testing
            </Link>
          </div>
        ) : (
          <AcceptTestForm
            campaignId={request.id}
            appName={request.app.name}
            ownerName={request.owner.name}
            durationDays={request.durationDays}
            defaultGmail={user.testingGmail || user.email}
          />
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <JsonButton
          url="/api/network/safety"
          body={{ action: "report", campaignId: request.id, reason: "spam" }}
          label="Report campaign"
          variant="ghost"
        />
        <JsonButton
          url="/api/network/safety"
          body={{ action: "block", targetId: request.owner.id }}
          label="Block developer"
          variant="danger"
        />
      </div>
    </AppShell>
  );
}
