"use client";

import { useEffect } from "react";

export function AuthToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950 shadow-raised sm:left-auto sm:right-6"
    >
      {message}
    </div>
  );
}
