"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useUnreadNotifications } from "@/components/notifications/unread-provider";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { PublicInboxItem } from "@/lib/inbox";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount, setUnreadCount } = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PublicInboxItem[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const headingId = useId();

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

  async function loadPanel() {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;
    const data = (await response.json()) as { notifications?: PublicInboxItem[]; unreadCount?: number };
    if (Array.isArray(data.notifications)) setItems(data.notifications.slice(0, 8));
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadPanel();
  }

  async function openItem(item: PublicInboxItem) {
    if (!item.readAt) {
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
      );
      setUnreadCount(unreadCount - 1);
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-read", id: item.id, read: true }),
      }).then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { unreadCount?: number };
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      });
    }
    setOpen(false);
    router.push(item.href || "/activity");
    router.refresh();
  }

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-control text-slate-500 transition-colors hover:bg-surface-strong hover:text-slate-900"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => void toggle()}
      >
        <Bell className="h-4.5 w-4.5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby={headingId}
          className="absolute right-0 top-10 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-white shadow-overlay"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h2 id={headingId} className="text-sm font-semibold text-slate-900">
              Notifications
            </h2>
            <Link
              href="/activity"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No notifications yet</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface",
                      item.readAt ? "bg-white" : "bg-brand-soft/40",
                    )}
                    onClick={() => void openItem(item)}
                  >
                    <span
                      className={
                        item.readAt
                          ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong"
                          : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                      }
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          item.readAt ? "font-medium text-slate-700" : "font-semibold text-slate-900",
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted" title={formatDateTime(item.createdAt)}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
