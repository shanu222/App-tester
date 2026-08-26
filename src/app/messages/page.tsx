import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";
import { publicDeveloper } from "@/lib/services/network";

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
    <AppShell title="Messages">
      <h2 className="mb-3 font-medium">Developer inbox</h2>
      <p className="mb-4 text-sm text-slate-400">
        Direct messages between developers. TestLoop does not auto-spam; notification preferences are in Settings.
      </p>
      {developerMessages.length === 0 ? (
        <EmptyState title="No developer messages" body="When another developer messages you, it appears here." />
      ) : (
        <div className="space-y-3">
          {developerMessages.map((item) => {
            const other = item.senderId === user.id ? item.recipient : item.sender;
            return (
              <div key={item.id} className="rounded-2xl border border-slate-800 p-4 text-sm">
                <div className="text-xs text-slate-500">
                  {formatDateTime(item.createdAt)} · {item.senderId === user.id ? "You →" : "From"}{" "}
                  {publicDeveloper(other).name}
                </div>
                <p className="mt-2 whitespace-pre-wrap">{item.body}</p>
              </div>
            );
          })}
        </div>
      )}
      <h2 className="mb-3 mt-10 font-medium">Pasted tester replies</h2>
      <div className="mb-5 rounded-2xl border border-slate-800 p-4 text-sm text-slate-400">
        Optional: paste a tester reply if you still collect Gmail outside the developer network.
      </div>
      {campaign ? <PasteReplyForm campaignId={campaign.id} /> : null}
      {messages.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No pasted tester replies yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-slate-800 p-4 text-sm">
              <div className="text-xs text-slate-500">
                {formatDateTime(message.createdAt)} · {message.channel} · {message.campaign?.name}
              </div>
              <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
