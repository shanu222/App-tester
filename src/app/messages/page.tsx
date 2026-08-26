import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/widgets";
import { formatDateTime } from "@/lib/utils";
import { PasteReplyForm } from "@/components/messages/paste-reply-form";

export default async function MessagesPage() {
  const user = await requireUser();
  const messages = await prisma.message.findMany({
    where: { userId: user.id },
    include: { tester: true, campaign: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const campaign = await prisma.campaign.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  return (
    <AppShell title="Messages">
      <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
        Automatic reply monitoring is unavailable for Facebook Group connections. Paste replies below. Page comments
        can sync when a Page access token is connected.
      </div>
      {campaign ? <PasteReplyForm campaignId={campaign.id} /> : null}
      <div className="mt-6 space-y-3">
        {messages.length === 0 ? (
          <EmptyState title="No messages stored" body="TesterBridge does not store entire Facebook conversations." />
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-2xl border border-slate-800 p-4 text-sm">
              <div className="text-xs text-slate-500">
                {formatDateTime(message.createdAt)} · {message.channel} · {message.campaign?.name}
              </div>
              <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
              {message.extractedEmail ? (
                <p className="mt-2 text-teal-300">Detected Gmail: {message.extractedEmail}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
