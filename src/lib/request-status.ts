import type { BadgeTone } from "@/components/ui/badge";

export function requestFillStatus(
  received: number,
  target: number,
  campaignStatus?: string,
): { label: "Open" | "Almost Full" | "Full" | "Completed"; tone: BadgeTone } {
  if (campaignStatus === "COMPLETED") return { label: "Completed", tone: "neutral" };
  if (target > 0 && received >= target) return { label: "Full", tone: "warn" };
  if (target > 0 && received / target >= 0.75) return { label: "Almost Full", tone: "warn" };
  return { label: "Open", tone: "good" };
}
