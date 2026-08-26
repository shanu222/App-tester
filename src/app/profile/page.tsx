import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { developerBadges, publicDeveloper } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { EmptyState, StatCard } from "@/components/ui/widgets";
import { CheckCircle2 } from "lucide-react";
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
        <Link href="/profile/complete">
          <Button variant="secondary">Edit profile</Button>
        </Link>
      }
    >
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-16 w-16 rounded-full border border-line object-cover"
            />
          ) : (
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-xl font-semibold text-brand"
              aria-hidden
            >
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
            <p className="mt-0.5 text-sm text-body">{profile.company || profile.developerType}</p>
            <p className="mt-0.5 text-sm text-muted">
              {profile.city ? `${profile.city}, ` : ""}
              {profile.country || "—"} · Joined {formatDate(profile.joinedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.key} tone={badge.key === "verified" ? "good" : "neutral"}>
                  {badge.key === "verified" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {user.bio ? (
          <p className="mt-5 max-w-2xl border-t border-line pt-5 text-sm leading-6 text-body">{user.bio}</p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Testing score"
          value={score.score ? `${score.score} / 5` : "—"}
          hint={score.label}
        />
        <StatCard label="Tests completed" value={score.completed} />
        <StatCard label="Tests participated in" value={score.accepted} />
        <StatCard label="Tests received" value={score.received} />
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        Google Play connected: {playConnected ? "yes" : "no"}. This is not a Google Play verification badge.
      </p>

      <SectionLabel className="mb-3 mt-10">Apps ({apps})</SectionLabel>
      {appRows.length === 0 ? (
        <EmptyState
          title="No apps added yet"
          body="Add an Android app to publish testing requests and track tester access."
          action={
            <Link href="/apps">
              <Button>Add an app</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {appRows.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-white px-4 py-3.5 shadow-card transition-colors hover:border-line-strong hover:bg-surface"
            >
              <span className="font-medium text-slate-900">{app.name}</span>
              <span className="font-mono text-xs text-muted">{app.packageName}</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
