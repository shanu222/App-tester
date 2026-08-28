import { safeHref } from "@/lib/utils";

export type PublicInboxItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  copyEmail: string | null;
  playConsole: boolean;
};

function parseInboxActions(value: unknown): { copyEmail: string | null; playConsole: boolean } {
  if (!value || typeof value !== "object") return { copyEmail: null, playConsole: false };
  const source = value as Record<string, unknown>;
  const email = typeof source.copyEmail === "string" ? source.copyEmail.trim() : "";
  return {
    copyEmail: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    playConsole: source.playConsole === true,
  };
}

export type InboxFilter = "all" | "unread" | "read";

export function sanitizeInboxHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return trimmed;
  }
  return safeHref(trimmed);
}

export function toPublicInboxItem(row: {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
  actions?: unknown;
  campaignId?: string | null;
  type?: string;
  userId?: string;
}): PublicInboxItem {
  const actions = parseInboxActions(row.actions);
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    href: sanitizeInboxHref(row.href),
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    copyEmail: actions.copyEmail,
    playConsole: actions.playConsole,
  };
}

export function filterInboxItems(items: PublicInboxItem[], filter: InboxFilter) {
  if (filter === "unread") return items.filter((item) => !item.readAt);
  if (filter === "read") return items.filter((item) => Boolean(item.readAt));
  return items;
}

export function unreadInboxCount(items: PublicInboxItem[]) {
  return items.filter((item) => !item.readAt).length;
}
