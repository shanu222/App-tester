import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { JsonButton } from "@/components/ui/json-button";
import { publicDeveloper } from "@/lib/services/network";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { normalizeEmail } from "@/lib/email-extract";
import { campaignTestingUrl } from "@/lib/integrations/play-testers";
import { TESTER_STATUS_LABELS } from "@/lib/status";
import { participationStatusLabel } from "@/lib/tester-labels";
import { enrollmentStatus } from "@/lib/enrollment-status";
import { detectTrackAccess } from "@/lib/integrations/play-access";

export default async function MyTestingPage() {
  const user = await requireUser();
  const emails = [user.testingGmail, user.email].filter(Boolean).map((value) => normalizeEmail(value!));
  const [mine, incoming, apps, joined] = await Promise.all([
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
    emails.length
      ? prisma.testerCampaign.findMany({
          where: { tester: { emailNormalized: { in: emails } } },
          include: { campaign: { include: { app: true, user: true } } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell
      title="My testing"
    >
      {mine.length === 0 ? (
        <EmptyState
          title="You are not testing any apps yet"
          body="Accept a published testing request from another developer."
          action={
            <Link href="/requests">
              <Button variant="secondary">Find testing requests</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {mine.map((row) => {
            const access = detectTrackAccess(row.campaign.testingType, null, row.campaign);
            const view = enrollmentStatus({
              status: row.status,
              playEnrollmentStatus: row.playEnrollmentStatus,
              joinKind: access.joinKind,
              confirmedAt: row.confirmedAt,
              campaignStatus: row.campaign.status,
            });
            const statusLabel = participationStatusLabel({
              status: row.status,
              playEnrollmentStatus: row.playEnrollmentStatus,
              joinKind: access.joinKind,
              confirmedAt: row.confirmedAt,
              campaignStatus: row.campaign.status,
              role: "tester",
            });
            const ready = view.key === "ready" || view.key === "developer_confirmed" || view.key === "play_verified";
            const groupJoinUrl = access.joinKind === "google_group" ? access.groupJoinUrl : null;
            const owner = publicDeveloper(row.owner);
            const playUrl = row.campaign.testingUrl || row.campaign.webOptInUrl;
            return (
              <div key={row.id} className="rounded-card border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{row.campaign.app.name}</div>
                    <div className="mt-0.5 text-sm text-muted">
                      {owner.name} · {row.campaign.testingType === "OPEN" ? "Open" : row.campaign.testingType === "INTERNAL" ? "Internal" : "Closed"} testing
                    </div>
                  </div>
                  <Badge tone={view.tone}>{statusLabel}</Badge>
                </div>
                {row.lastError && view.key !== "pending_developer" ? (
                  <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
                    {row.lastError}
                  </p>
                ) : null}
                {view.key === "pending_developer" ? (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Request sent. The developer will add/confirm your Google Play testing access.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {groupJoinUrl && view.key !== "rejected" ? (
                    <a href={groupJoinUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm">
                        Join Google Group
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </a>
                  ) : null}
                  {ready && playUrl ? (
                    <a href={playUrl} target="_blank" rel="noreferrer">
                      <Button size="sm">
                        Open Google Play
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </a>
                  ) : null}
                  {!ready && access.joinKind === "google_group" && !groupJoinUrl ? (
                    <Link href={`/requests/${row.campaignId}`}>
                      <Button variant="secondary" size="sm">
                        Continue joining
                      </Button>
                    </Link>
                  ) : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  {row.status === "FAILED" ? (
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

      {joined.length > 0 ? (
        <>
          <SectionLabel className="mb-3 mt-10">My tests</SectionLabel>
          <div className="space-y-4">
            {joined.map((row) => {
              const playUrl = campaignTestingUrl({
                testingType: row.campaign.testingType,
                packageName: row.campaign.app.packageName,
                configuredUrl: row.campaign.testingUrl || row.campaign.webOptInUrl,
              }).url;
              const waiting = row.status === "ADDING";
              const failed = row.status === "ERROR";
              return (
                <div key={row.id} className="rounded-card border border-line bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{row.campaign.app.name}</div>
                      <div className="mt-0.5 text-sm text-muted">
                        {row.campaign.testingType.toLowerCase()} testing
                        {row.campaign.playTrack ? ` · ${row.campaign.playTrack}` : ""}
                      </div>
                    </div>
                    <Badge tone={failed ? "warn" : waiting ? "warn" : "neutral"}>
                      {TESTER_STATUS_LABELS[row.status]}
                    </Badge>
                  </div>
                  {row.lastError ? (
                    <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
                      {row.lastError}
                    </p>
                  ) : null}
                  {playUrl ? (
                    <a
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                      href={playUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Google Play
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <SectionLabel className="mb-3 mt-10">Reciprocal testing</SectionLabel>
      {incoming.length === 0 ? (
        <p className="text-sm text-muted">No reciprocal requests yet.</p>
      ) : (
        <div className="space-y-2.5">
          {incoming.map((row) => {
            const other = row.requesterId === user.id ? row.target : row.requester;
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{publicDeveloper(other).name}</div>
                  <div className="mt-0.5 text-sm text-muted">{row.status.replaceAll("_", " ")}</div>
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
