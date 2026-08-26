import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getApp } from "@/lib/services/apps";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const app = await getApp(user.id, id);
  return (
    <AppShell title={app.name}>
      <p className="text-slate-400">{app.packageName}</p>
      <div className="mt-4 flex gap-2">
        <Badge>{app.testingType}</Badge>
        {app.syncedFromPlay ? <Badge tone="good">Synced</Badge> : <Badge>Manual</Badge>}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-medium">Tracks</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {app.tracks.map((track) => (
            <li key={track.id}>
              {track.name} · {track.testingType} · {track.googleGroupEmail || "no group"}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <h2 className="font-medium">Campaigns</h2>
        <ul className="mt-3 space-y-2">
          {app.campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link className="text-sky-300" href={`/campaigns/${campaign.id}`}>
                {campaign.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
