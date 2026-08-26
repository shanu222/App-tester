import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPublicRequest } from "@/lib/services/network";
import { AcceptTestForm } from "@/components/network/accept-test-form";
import { JsonButton } from "@/components/ui/json-button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const request = await getPublicRequest(user.id, id);

  return (
    <AppShell title={request.app.name}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span>
          Developer:{" "}
          <Link href={`/developers/${request.owner.id}`} className="text-teal-300">
            {request.owner.name}
          </Link>
        </span>
        <Badge>{request.testingType} testing</Badge>
        <span>
          Testers needed: {request.targetTesters} · received {request.testersReceived} / {request.targetTesters}
        </span>
        <span>Testing period: {request.durationDays} days</span>
      </div>
      <p className="max-w-3xl text-slate-300">
        {request.description ||
          `We are looking for Android developers to help test ${request.app.name} through Google Play ${request.testingType.toLowerCase()} testing. Developers participating in the campaign can also request testers for their own applications.`}
      </p>
      {request.testingInstructions ? (
        <div className="mt-4 rounded-2xl border border-slate-800 p-4 text-sm text-slate-300">
          {request.testingInstructions}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        Google emails stay private until you confirm participation.
      </p>
      <div className="mt-6">
        {request.isOwner ? (
          <Link href={`/campaigns/${request.id}`} className="text-sm text-teal-300">
            Manage your campaign
          </Link>
        ) : request.participation?.consentAt ? (
          <div className="rounded-2xl border border-slate-800 p-5 text-sm">
            <div>Status: {request.participation.status}</div>
            {request.participation.lastError ? (
              <p className="mt-2 text-amber-200">{request.participation.lastError}</p>
            ) : null}
            <Link href="/testing" className="mt-3 inline-block text-teal-300">
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
