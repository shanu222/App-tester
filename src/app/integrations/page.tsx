import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { facebookConfigured } from "@/lib/integrations/facebook";
import { googleOAuthConfigured } from "@/lib/env";
import { timeAgo } from "@/lib/utils";
import { PlayConnectForm } from "@/components/integrations/play-connect-form";
import { WorkspaceForm } from "@/components/integrations/workspace-form";
import { JsonButton } from "@/components/ui/json-button";
import { FACEBOOK_GROUP_LIMITATION, PLAY_EMAIL_LIST_LIMITATION, GROUPS_API_LIMITATION } from "@/lib/integrations/capabilities";

function statusLabel(status?: string) {
  if (status === "CONNECTED") return "Connected";
  if (status === "ERROR") return "Error";
  if (status === "EXPIRED") return "Expired";
  if (status === "CONNECTING") return "Connecting";
  return "Not connected";
}

function tone(status: string) {
  if (status === "CONNECTED") return "good" as const;
  if (status === "ERROR" || status === "EXPIRED") return "bad" as const;
  if (status === "CONNECTING") return "warn" as const;
  return "neutral" as const;
}

export default async function IntegrationsPage() {
  const user = await requireUser();
  const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
  const byProvider = (provider: string) =>
    integrations.find((item) => item.provider === provider);

  const cards = [
    {
      provider: "FACEBOOK",
      title: "Facebook / Meta",
      item: byProvider("FACEBOOK"),
      connectHref: facebookConfigured() ? "/api/integrations/facebook/start" : undefined,
      note: FACEBOOK_GROUP_LIMITATION,
    },
    {
      provider: "GOOGLE",
      title: "Google",
      item: byProvider("GOOGLE") || byProvider("GMAIL"),
      connectHref: googleOAuthConfigured() ? "/api/gmail/connect" : undefined,
      note: "Optional Gmail send via official OAuth. Sign-in uses Google OAuth and never stores a Google password.",
    },
    {
      provider: "GMAIL",
      title: "Gmail",
      item: byProvider("GMAIL"),
      connectHref: googleOAuthConfigured() ? "/api/gmail/connect" : undefined,
      note: "Gmail API send requires the user to enable automated email in Settings.",
    },
    {
      provider: "GOOGLE_PLAY",
      title: "Google Play",
      item: byProvider("GOOGLE_PLAY"),
      note: PLAY_EMAIL_LIST_LIMITATION,
    },
    {
      provider: "GOOGLE_WORKSPACE",
      title: "Google Workspace / Groups",
      item: byProvider("GOOGLE_WORKSPACE"),
      note: GROUPS_API_LIMITATION,
    },
  ];

  return (
    <AppShell title="Integrations">
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <div key={card.provider} className="rounded-xl border border-slate-800 bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{card.title}</h2>
              <Badge tone={tone(card.item?.status || "NOT_CONNECTED")}>
                {statusLabel(card.item?.status)}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Last sync: {card.item?.lastSyncAt ? timeAgo(card.item.lastSyncAt) : "never"}
              {card.item?.lastError ? ` · ${card.item.lastError}` : ""}
            </p>
            <p className="mt-3 text-sm text-slate-400">{card.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.connectHref ? (
                <a className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950" href={card.connectHref}>
                  Connect / Reconnect
                </a>
              ) : null}
              <JsonButton
                url={`/api/integrations?provider=${card.provider}`}
                method="DELETE"
                label="Disconnect"
                variant="ghost"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <PlayConnectForm />
        <WorkspaceForm />
      </div>
    </AppShell>
  );
}
