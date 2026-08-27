import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { facebookConfigured } from "@/lib/integrations/facebook";
import { googleOAuthConfigured } from "@/lib/env";
import { timeAgo } from "@/lib/utils";
import { JsonButton } from "@/components/ui/json-button";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";

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

  type IntegrationCard = {
    provider: string;
    title: string;
    item: (typeof integrations)[number] | undefined;
    note: string;
    connectHref?: string;
    manageHref?: string;
  };

  const cards: IntegrationCard[] = [
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
      note: "Optional Gmail send via official OAuth. TestLoop sign-in is handled by Firebase and never stores a Google password.",
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
      manageHref: "/play",
      note: PLAY_TESTER_API_LIMITATION,
    },
  ];

  return (
    <AppShell
      title="Integrations"
      description="Connect official Google APIs. TestLoop never stores a Google password."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.provider}
            className="flex flex-col rounded-card border border-line bg-white p-5 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-slate-900">{card.title}</h2>
              <Badge tone={tone(card.item?.status || "NOT_CONNECTED")}>
                {statusLabel(card.item?.status)}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted">
              Last sync: {card.item?.lastSyncAt ? timeAgo(card.item.lastSyncAt) : "never"}
              {card.item?.lastError ? ` · ${card.item.lastError}` : ""}
            </p>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{card.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.connectHref ? (
                <a
                  className="inline-flex h-9.5 items-center rounded-control bg-brand px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-hover"
                  href={card.connectHref}
                >
                  Connect / Reconnect
                </a>
              ) : null}
              {card.manageHref ? (
                <a
                  className="inline-flex h-9.5 items-center rounded-control bg-brand px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-hover"
                  href={card.manageHref}
                >
                  Manage
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
    </AppShell>
  );
}
