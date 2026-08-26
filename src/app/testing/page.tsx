import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { JsonButton } from "@/components/ui/json-button";
import { publicDeveloper } from "@/lib/services/network";
import Link from "next/link";

export default async function MyTestingPage() {
  const user = await requireUser();
  const [mine, incoming, apps] = await Promise.all([
    prisma.testingParticipation.findMany({
      where: { testerUserId: user.id },
      include: { campaign: { include: { app: true } }, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.reciprocalTest.findMany({
      where: { OR: [{ requesterId: user.id }, { targetId: user.id }] },
      include: { requester: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.app.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShell title="My testing">
      <p className="mb-6 max-w-2xl text-sm text-slate-400">
        Status changes only after a real event: your consent, a Google API result, owner confirmation, your opt-in,
        or submitted feedback. TesterBridge does not invent downloads.
      </p>
      {mine.length === 0 ? (
        <EmptyState
          title="You are not testing any apps yet"
          body="Accept a published testing request from another developer."
          action={
            <Link href="/requests" className="text-sm text-teal-300">
              Find testing requests
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {mine.map((row) => {
            const ready = ["ADDED", "INVITATION_READY", "OPTED_IN", "ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(
              row.status,
            );
            const owner = publicDeveloper(row.owner);
            return (
              <div key={row.id} className="rounded-2xl border border-slate-800 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.campaign.app.name}</div>
                    <div className="text-sm text-slate-400">
                      {owner.name} · {row.campaign.testingType}
                    </div>
                  </div>
                  <Badge tone={row.status === "FAILED" || row.status === "MANUAL_REQUIRED" ? "warn" : "neutral"}>
                    {row.status}
                  </Badge>
                </div>
                {row.lastError ? <p className="mt-2 text-sm text-amber-200">{row.lastError}</p> : null}
                {ready && row.campaign.webOptInUrl ? (
                  <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm">
                    <div className="font-medium">You&apos;re ready to test</div>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
                      <li>Open the testing link.</li>
                      <li>Join the test.</li>
                      <li>Install the app from Google Play.</li>
                      <li>Use the app according to the developer&apos;s instructions.</li>
                      <li>Submit feedback.</li>
                    </ol>
                    <a
                      className="mt-3 inline-block text-teal-300"
                      href={row.campaign.webOptInUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join Google Play test
                    </a>
                  </div>
                ) : ready && !row.campaign.webOptInUrl ? (
                  <p className="mt-3 text-sm text-slate-400">
                    Access is configured. A testing/opt-in URL has not been stored for this campaign, so TesterBridge
                    will not show a join link yet.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status === "FAILED" || row.status === "MANUAL_REQUIRED" ? (
                    <JsonButton
                      url="/api/network"
                      body={{ action: "retry-access", participationId: row.id }}
                      label="Retry access"
                      variant="secondary"
                    />
                  ) : null}
                  {row.status === "ADDED" || row.status === "INVITATION_READY" ? (
                    <JsonButton
                      url="/api/network"
                      body={{ action: "opted-in", participationId: row.id }}
                      label="I joined the test"
                      variant="secondary"
                    />
                  ) : null}
                  {["OPTED_IN", "ACTIVITY_DETECTED", "ADDED", "INVITATION_READY"].includes(row.status) ? (
                    <JsonButton
                      url="/api/network"
                      body={{ action: "feedback", participationId: row.id, overall: 5, suggestions: "Completed testing." }}
                      label="Submit quick feedback"
                    />
                  ) : null}
                  {row.campaign.reciprocalOpen ? (
                    <JsonButton
                      url="/api/network"
                      body={{
                        action: "reciprocal-request",
                        targetId: row.ownerUserId,
                        requesterAppId: apps[0]?.id,
                      }}
                      label="Request reciprocal test"
                      variant="ghost"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-400">Reciprocal testing</h2>
      {incoming.length === 0 ? (
        <p className="text-sm text-slate-500">No reciprocal requests yet.</p>
      ) : (
        <div className="space-y-3">
          {incoming.map((row) => {
            const other = row.requesterId === user.id ? row.target : row.requester;
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 p-4">
                <div className="text-sm">
                  <div className="font-medium">{publicDeveloper(other).name}</div>
                  <div className="text-slate-400">{row.status}</div>
                </div>
                {row.targetId === user.id && row.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <JsonButton url="/api/network" body={{ action: "reciprocal-respond", reciprocalId: row.id, accept: true }} label="Accept" />
                    <JsonButton
                      url="/api/network"
                      body={{ action: "reciprocal-respond", reciprocalId: row.id, accept: false }}
                      label="Decline"
                      variant="secondary"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
