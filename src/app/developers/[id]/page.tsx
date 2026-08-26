import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { developerBadges, publicDeveloper } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { JsonButton } from "@/components/ui/json-button";
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
      <p className="text-slate-400">{profile.company}</p>
      <p className="text-sm text-slate-500">
        {profile.country || "—"} · Joined {formatDate(profile.joinedAt)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Badge key={badge.key}>{badge.label}{badge.key === "verified" ? " ✓" : ""}</Badge>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 p-4 text-sm">Apps: {apps}</div>
        <div className="rounded-2xl border border-slate-800 p-4 text-sm">Score: {score.score ?? "—"}</div>
        <div className="rounded-2xl border border-slate-800 p-4 text-sm">Completed tests: {score.completed}</div>
      </div>
      {profile.bio ? <p className="mt-6 max-w-2xl text-slate-300">{profile.bio}</p> : null}
      <div className="mt-6 space-y-2 text-sm">
        {appRows.map((app) => (
          <div key={app.packageName} className="rounded-xl border border-slate-800 px-4 py-3">
            {app.name}
          </div>
        ))}
      </div>
      {viewer.id !== user.id ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <JsonButton url="/api/network/safety" body={{ action: "report", targetId: user.id, reason: "abuse" }} label="Report developer" variant="ghost" />
          <JsonButton url="/api/network/safety" body={{ action: "block", targetId: user.id }} label="Block" variant="danger" />
        </div>
      ) : null}
    </AppShell>
  );
}
