import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { developerBadges, publicDeveloper } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { JsonButton } from "@/components/ui/json-button";
import { SectionLabel } from "@/components/ui/card";
import { StatCard } from "@/components/ui/widgets";
import { notFound } from "next/navigation";

export default async function DeveloperPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireUser();
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null, suspendedAt: null },
  });
  if (!user) notFound();
  const { badges, apps, score } = await developerBadges(user.id);
  const profile = publicDeveloper(user);
  const appRows = await prisma.app.findMany({
    where: { userId: user.id },
    select: { name: true, packageName: true },
  });

  return (
    <AppShell title={profile.name}>
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand"
            aria-hidden
          >
            {profile.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{profile.company || "Independent developer"}</p>
            <p className="mt-0.5 text-sm text-muted">
              {profile.country || "—"} · Joined {formatDate(profile.joinedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.key} tone={badge.key === "verified" ? "good" : "neutral"}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-5 max-w-2xl border-t border-line pt-5 text-sm leading-6 text-body">{profile.bio}</p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Apps" value={apps} />
        <StatCard
          label="Testing score"
          value={score.score ? `${score.score} / 5` : "—"}
          hint={score.label}
        />
        <StatCard label="Tests completed" value={score.completed} />
      </div>

      <SectionLabel className="mb-3 mt-10">Apps</SectionLabel>
      {appRows.length === 0 ? (
        <p className="text-sm text-muted">This developer has not added any apps yet.</p>
      ) : (
        <div className="space-y-2.5">
          {appRows.map((app) => (
            <div
              key={app.packageName}
              className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-white px-4 py-3.5 shadow-card"
            >
              <span className="font-medium text-slate-900">{app.name}</span>
            </div>
          ))}
        </div>
      )}
      {viewer.id !== user.id ? (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
          <JsonButton url="/api/network/safety" body={{ action: "report", targetId: user.id, reason: "abuse" }} label="Report developer" variant="ghost" />
          <JsonButton url="/api/network/safety" body={{ action: "block", targetId: user.id }} label="Block" variant="danger" />
        </div>
      ) : null}
    </AppShell>
  );
}
