import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getApp } from "@/lib/services/apps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { AppMark } from "@/components/brand/app-mark";
import { connectionLabel } from "@/lib/manual-app";
import Link from "next/link";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const app = await getApp(user.id, id);
  const types = Array.from(new Set([app.testingType, ...app.campaigns.map((item) => item.testingType)]));
  return (
    <AppShell
      title={app.name}
      actions={
        <div className="flex gap-2">
          {app.playStoreUrl ? (
            <a
              href={app.playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9.5 items-center rounded-control bg-brand px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-hover"
            >
              Open Google Play
            </a>
          ) : null}
          <Link href={`/campaigns?appId=${app.id}`}>
            <Button variant="secondary">Publish testing</Button>
          </Link>
        </div>
      }
    >
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <AppMark src={app.iconUrl} name={app.name} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <TestingTypeBadge key={type} type={type} />
              ))}
              <Badge tone={app.syncedFromPlay ? "good" : "neutral"}>{connectionLabel(app.syncedFromPlay)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {app.syncedFromPlay
                ? "App information comes from Google Play Console."
                : "Manual app. TestLoop has not verified this listing on Google Play."}
            </p>
          </div>
        </div>
      </section>

      {app.playConflictNote ? (
        <p className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          {app.playConflictNote}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {app.syncedFromPlay ? (
          <Card>
            <CardHeader title="Tracks" description="Testing tracks from Google Play." />
            {app.tracks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No tracks stored yet.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {app.tracks.map((track) => (
                  <li key={track.id} className="rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm">
                    <span className="font-medium text-slate-900">{track.name}</span>
                    <span className="text-muted"> · {track.testingType}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Testing requests" />
          {app.campaigns.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No testing requests for this app yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {app.campaigns.map((item) => (
                <li key={item.id}>
                  <Link
                    className="block rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand"
                    href={`/campaigns/${item.id}`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
