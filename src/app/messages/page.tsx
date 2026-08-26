import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";
import { publicDeveloper } from "@/lib/services/network";
import { SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

export default async function MessagesPage() {
  const user = await requireUser();
  const [developerMessages, messages, campaign] = await Promise.all([
    prisma.developerMessage.findMany({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.message.findMany({
      where: { userId: user.id },
      include: { tester: true, campaign: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.campaign.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
    }),
  ]);
  return (
    <AppShell
      title="Messages"
      description="Direct developer messages. TestLoop never auto-sends on your behalf."
    >
      <SectionLabel className="mb-3">Developer inbox</SectionLabel>
      {developerMessages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-4.5 w-4.5" aria-hidden />}
          title="No developer messages"
          body="When another developer messages you, the conversation appears here."
        />
      ) : (
        <div className="space-y-2.5">
          {developerMessages.map((item) => {
            const outgoing = item.senderId === user.id;
            const other = outgoing ? item.recipient : item.sender;
            return (
              <div key={item.id} className="rounded-card border border-line bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={outgoing ? "neutral" : "accent"}>{outgoing ? "Sent" : "Received"}</Badge>
                  <span className="text-sm font-medium text-slate-900">{publicDeveloper(other).name}</span>
                  <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-body">{item.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <SectionLabel className="mb-3 mt-10">Pasted tester replies</SectionLabel>
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
        Optional: paste a tester reply if you still collect Gmail outside the developer network.
      </p>
      {campaign ? <PasteReplyForm campaignId={campaign.id} /> : null}
      {messages.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No pasted tester replies yet.</p>
      ) : (
        <div className="mt-6 space-y-2.5">
          {messages.map((message) => (
            <div key={message.id} className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-slate-700">{message.campaign?.name}</span>
                <span>· {message.channel} ·</span>
                <span>{formatDateTime(message.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">{message.body}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
