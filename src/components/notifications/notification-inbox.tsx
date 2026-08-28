"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, MoreHorizontal, RefreshCw, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/widgets";
import { FilterButtons } from "@/components/ui/filter-pills";
import { useUnreadNotifications } from "@/components/notifications/unread-provider";
import { filterInboxItems, type InboxFilter, type PublicInboxItem } from "@/lib/inbox";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

export function NotificationInbox({ initial }: { initial: PublicInboxItem[] }) {
  const router = useRouter();
  const { unreadCount, setUnreadCount } = useUnreadNotifications();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const visible = filterInboxItems(items, filter);

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { error?: string; unreadCount?: number };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update notifications.");
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
    return data;
  }

  async function refresh() {
    setPending("refresh");
    setError(null);
    try {
      const response = await fetch("/api/notifications");
      const data = (await response.json()) as { notifications?: PublicInboxItem[]; unreadCount?: number; error?: string };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to refresh notifications.");
      if (Array.isArray(data.notifications)) setItems(data.notifications);
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh notifications.");
    } finally {
      setPending(null);
    }
  }

  async function markAllRead() {
    const unread = items.filter((item) => !item.readAt);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadCount(0);
    setPending("mark-all");
    setError(null);
    try {
      await post({ action: "mark-all-read" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark notifications as read.");
      await refresh();
    } finally {
      setPending(null);
    }
  }

  async function deleteAll() {
    const snapshot = items;
    setItems([]);
    setUnreadCount(0);
    setConfirmDeleteAll(false);
    setPending("delete-all");
    setError(null);
    try {
      await post({ action: "delete-all" });
      router.refresh();
    } catch (err) {
      setItems(snapshot);
      setError(err instanceof Error ? err.message : "Unable to delete notifications.");
      await refresh();
    } finally {
      setPending(null);
    }
  }

  async function setRead(id: string, read: boolean) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, readAt: read ? new Date().toISOString() : null } : item,
      ),
    );
    setUnreadCount(read ? unreadCount - 1 : unreadCount + 1);
    setError(null);
    try {
      await post({ action: "set-read", id, read });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
      await refresh();
    }
  }

  async function remove(id: string) {
    const target = items.find((item) => item.id === id);
    setItems((current) => current.filter((item) => item.id !== id));
    if (target && !target.readAt) setUnreadCount(unreadCount - 1);
    setError(null);
    try {
      await post({ action: "delete", id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete notification.");
      await refresh();
    }
  }

  const emptyAll = items.length === 0;
  const busy = pending !== null;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterButtons
          items={[
            { id: "all", label: "All", active: filter === "all", onClick: () => setFilter("all") },
            { id: "unread", label: "Unread", active: filter === "unread", onClick: () => setFilter("unread") },
            { id: "read", label: "Read", active: filter === "read", onClick: () => setFilter("read") },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Mark all as read
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={busy || items.length === 0}
            onClick={() => setConfirmDeleteAll(true)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete all notifications
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void refresh()}>
            <RefreshCw className={cn("h-3.5 w-3.5", pending === "refresh" ? "animate-spin" : "")} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {emptyAll ? (
        <EmptyState
          icon={<Bell className="h-4.5 w-4.5" aria-hidden />}
          title="No notifications yet"
          body="Your TestLoop activity and important updates will appear here."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread notifications" : "No read notifications"}
          body={
            filter === "unread"
              ? "You are up to date."
              : "Read notifications will appear here."
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              disabled={busy}
              onRead={(read) => void setRead(item.id, read)}
              onDelete={() => void remove(item.id)}
            />
          ))}
        </ul>
      )}

      {confirmDeleteAll ? (
        <DeleteAllDialog
          pending={pending === "delete-all"}
          onCancel={() => setConfirmDeleteAll(false)}
          onConfirm={() => void deleteAll()}
        />
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  disabled,
  onRead,
  onDelete,
}: {
  item: PublicInboxItem;
  disabled: boolean;
  onRead: (read: boolean) => void;
  onDelete: () => void;
}) {
  const unread = !item.readAt;

  return (
    <li
      className={cn(
        "group relative flex gap-3 rounded-card border px-3 py-3 shadow-card sm:px-4",
        unread ? "border-brand/20 bg-brand-soft/50" : "border-line bg-white",
      )}
    >
      <span
        className={unread ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong"}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-sm text-slate-900", unread ? "font-semibold" : "font-medium")}>{item.title}</p>
            {item.body ? <p className="mt-0.5 text-sm leading-6 text-muted">{item.body}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <time
              className="hidden text-xs text-muted sm:block"
              dateTime={item.createdAt}
              title={formatDateTime(item.createdAt)}
            >
              {timeAgo(item.createdAt)}
            </time>
            <button
              type="button"
              className="hidden h-8 w-8 items-center justify-center rounded-control text-slate-400 opacity-0 transition-opacity hover:bg-surface-strong hover:text-red-700 sm:inline-flex group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Delete notification"
              disabled={disabled}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <ItemMenu unread={unread} disabled={disabled} onRead={onRead} onDelete={onDelete} />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <time className="text-xs text-muted sm:hidden" dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
            {timeAgo(item.createdAt)}
          </time>
          {item.href ? (
            <Link
              href={item.href}
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => {
                if (unread) onRead(true);
              }}
            >
              View
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ItemMenu({
  unread,
  disabled,
  onRead,
  onDelete,
}: {
  unread: boolean;
  disabled: boolean;
  onRead: (read: boolean) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-control text-slate-500 hover:bg-surface-strong hover:text-slate-900"
        aria-label="Notification actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-9 z-20 min-w-44 rounded-control border border-line bg-white py-1 shadow-overlay"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-surface"
            onClick={() => {
              setOpen(false);
              onRead(unread);
            }}
          >
            {unread ? "Mark as read" : "Mark as unread"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DeleteAllDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const headingId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-overlay"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={headingId} className="text-lg font-semibold text-slate-900">
          Delete all notifications?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          This will permanently remove all notifications from your TestLoop activity.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            className="border-red-700 bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
