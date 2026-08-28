import type { TestingType } from "@prisma/client";
import { googleGroupJoinUrl } from "@/lib/integrations/play-access";

export function isManualApp(app: { syncedFromPlay?: boolean | null; playTrack?: string | null }) {
  return !app.syncedFromPlay && !app.playTrack;
}

export function connectionLabel(syncedFromPlay: boolean) {
  return syncedFromPlay ? "Google Play Connected" : "Manual";
}

export function manualFieldsForType(type: TestingType | string) {
  return {
    downloadLink: type === "INTERNAL",
    playTestingLink: type === "CLOSED" || type === "OPEN",
    googleGroup: type === "CLOSED",
  };
}

export function optionalHttpUrl(value: string | null | undefined): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = value?.trim() || "";
  if (!trimmed) return { ok: true, url: null };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Links must start with http:// or https://." };
    }
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false, error: "Enter a valid link." };
  }
}

/**
 * Accept a Google Group email or a groups.google.com join link.
 * Never invents a group that the developer did not provide.
 */
export function parseManualGroupInput(value: string | null | undefined): {
  email: string | null;
  joinUrl: string | null;
  error: string | null;
} {
  const trimmed = value?.trim() || "";
  if (!trimmed) return { email: null, joinUrl: null, error: null };

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { email: null, joinUrl: null, error: "Enter a valid Google Group email." };
    }
    return { email, joinUrl: googleGroupJoinUrl(email), error: null };
  }

  const parsed = optionalHttpUrl(trimmed);
  if (!parsed.ok) return { email: null, joinUrl: null, error: parsed.error };
  try {
    const url = new URL(parsed.url!);
    if (url.hostname !== "groups.google.com") {
      return { email: null, joinUrl: null, error: "Use a Google Group email or a groups.google.com link." };
    }
    const match = url.pathname.match(/\/g\/([^/]+)/);
    const local = match?.[1] ? decodeURIComponent(match[1]) : "";
    return {
      email: local ? `${local.toLowerCase()}@googlegroups.com` : null,
      joinUrl: parsed.url,
      error: null,
    };
  } catch {
    return { email: null, joinUrl: null, error: "Enter a valid Google Group email or link." };
  }
}

export function uniqueTestingTypes(
  appType: TestingType | string,
  campaigns: Array<{ testingType: TestingType | string }>,
) {
  const seen = new Set<string>();
  const types: string[] = [];
  for (const type of [appType, ...campaigns.map((row) => row.testingType)]) {
    if (!type || seen.has(type)) continue;
    seen.add(type);
    types.push(type);
  }
  return types;
}
