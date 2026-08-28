"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type UnreadContextValue = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
};

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadNotificationsProvider({
  initialUnread,
  children,
}: {
  initialUnread: number;
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCountState] = useState(initialUnread);
  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, count));
  }, []);

  useEffect(() => {
    setUnreadCountState(Math.max(0, initialUnread));
  }, [initialUnread]);
  const value = useMemo(() => ({ unreadCount, setUnreadCount }), [unreadCount, setUnreadCount]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadNotifications() {
  const value = useContext(UnreadContext);
  if (!value) {
    throw new Error("Unread notifications provider is missing.");
  }
  return value;
}
