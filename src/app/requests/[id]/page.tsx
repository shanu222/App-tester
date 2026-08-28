import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPublicRequest } from "@/lib/services/network";
import { AcceptTestForm } from "@/components/network/accept-test-form";
import { JsonButton } from "@/components/ui/json-button";
import { Badge } from "@/components/ui/badge";
import { AppMark } from "@/components/brand/app-mark";
import { requestFillStatus } from "@/lib/request-status";
import { Button } from "@/components/ui/button";
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
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <p className="mt-3 text-sm leading-6 text-body">Looking for developers to test this app.</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <AppMark src={request.app.iconUrl} name={request.app.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={fill.tone}>{fill.label}</Badge>
              {pending ? <Badge tone="warn">Pending</Badge> : null}
              <Badge tone="accent">{request.trackLabel}</Badge>
              {request.reciprocalOpen ? <Badge>Reciprocal testing</Badge> : null}
              {request.playConnected ? <Badge tone="good">Google Play connected</Badge> : null}
            </div>
            <p className="mt-3 text-sm text-muted">
              Developer:{" "}
              <Link href={`/developers/${request.owner.id}`} className="font-medium text-brand hover:underline">
                {request.owner.name}
              </Link>
              {request.owner.country ? ` · ${request.owner.country}` : ""}
            </p>
            <p className="mt-1.5 font-mono text-xs text-muted">{request.app.packageName}</p>
            <p className="mt-1.5 text-sm text-body">
              <span className="font-medium text-slate-900 tabular-nums">
                {request.remaining}
              </span>{" "}
              testing slots available · {request.durationDays} day duration
            </p>
            {request.versionLabel ? (
              <p className="mt-1 text-sm text-muted">Version: {request.versionLabel}</p>
            ) : null}
            <p className="mt-1 text-sm text-muted">
              Google Play testing link:{" "}
              {request.testingType === "OPEN" && request.openTestingUrl
                ? "Available"
                : request.testingLinkStatus === "available"
                  ? "Provided after enrollment"
                  : request.testingLinkStatus || "Not available through Google Play API"}
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-3xl border-t border-line pt-5 text-sm leading-7 text-body">
          {request.description || "This developer did not add a campaign description."}
        </p>

        {request.testingInstructions ? (
          <div className="mt-4 rounded-control border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Testing requirements
            </div>
            <p className="mt-2 text-sm leading-6 text-body">{request.testingInstructions}</p>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-muted">
          Google emails stay private until you confirm participation.
        </p>
      </section>

      <div className="mt-6">
        {request.isOwner ? (
          <Link href={`/campaigns/${request.id}`}>
            <Button variant="secondary">Manage your campaign</Button>
          </Link>
        ) : request.participation?.consentAt ? (
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <div className="text-sm text-body">
              Status:{" "}
              <span className="font-medium text-slate-900">
                {request.participation.status.replaceAll("_", " ")}
              </span>
            </div>
            {request.participation.lastError ? (
              <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
                {request.participation.lastError}
              </p>
            ) : null}
            <Link href="/testing" className="mt-4 inline-block">
              <Button variant="secondary">Open My Testing</Button>
            </Link>
          </div>
        ) : (
          <AcceptTestForm
            campaignId={request.id}
            appName={request.app.name}
            ownerName={request.owner.name}
            durationDays={request.durationDays}
            defaultGmail={user.testingGmail || user.email || ""}
            alreadyAccepted={Boolean(request.participation && !request.participation.consentAt)}
          />
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
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
