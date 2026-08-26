import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { developerBadges, publicDeveloper } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await requireUser();
  const { badges, apps, playConnected, score } = await developerBadges(user.id);
  const appRows = await prisma.app.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, packageName: true },
  });
  const profile = publicDeveloper(user);

  return (
    <AppShell
      title="Developer profile"
      actions={
        <Link href="/profile/complete" className="text-sm text-emerald-300 hover:underline">
          Edit profile
        </Link>
      }
    >
      <div className="flex flex-wrap items-start gap-5">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : null}
        <div>
          <h2 className="text-2xl font-semibold">{profile.name}</h2>
          <p className="text-slate-400">{profile.company || profile.developerType}</p>
          <p className="text-sm text-slate-500">
            {profile.city ? `${profile.city}, ` : ""}
            {profile.country || "—"} · Joined {formatDate(profile.joinedAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge.key} tone={badge.key === "verified" ? "good" : "neutral"}>
                {badge.label}
                {badge.key === "verified" ? " ✓" : ""}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Testing score</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{score.score ?? "—"}{score.score ? " / 5" : ""}</div>
          <p className="mt-1 text-xs text-slate-500">{score.label}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests completed</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{score.completed}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests participated in</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{score.accepted}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests received</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{score.received}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Google Play connected: {playConnected ? "yes" : "no"}. This is not a Google Play verification badge.
      </p>
      {user.bio ? <p className="mt-6 max-w-2xl text-slate-300">{user.bio}</p> : null}
      <h2 className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-slate-500">Apps ({apps})</h2>
      {appRows.length === 0 ? (
        <p className="text-sm text-slate-500">No apps added yet.</p>
      ) : (
        <div className="space-y-2">
          {appRows.map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="block rounded-xl border border-slate-800 px-4 py-3 text-sm hover:border-slate-700">
              {app.name}
              <span className="ml-2 text-slate-500">{app.packageName}</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
