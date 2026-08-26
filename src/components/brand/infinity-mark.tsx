import { useId } from "react";
import { cn } from "@/lib/utils";

const INFINITY_PATH =
  "M20 40C20 12 52 12 80 40C108 68 140 68 140 40C140 12 108 12 80 40C52 68 20 68 20 40";

export function InfinityMark({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const height = Math.round(size * 0.5);
  const scale = size / 160;

  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-visible", className)}
      style={{ width: size, height }}
      aria-hidden
    >
      <span
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: 160, height: 80, transform: `scale(${scale})` }}
      >
        <svg viewBox="0 0 160 80" width={160} height={80} fill="none" className="overflow-visible">
          <defs>
            <linearGradient id={`${uid}-stroke`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#2f6fed" />
              <stop offset="50%" stopColor="#3ee0a0" />
              <stop offset="100%" stopColor="#12b981" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={INFINITY_PATH}
            stroke={`url(#${uid}-stroke)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
          />
          <path
            d={INFINITY_PATH}
            className="infinity-flow"
            stroke={`url(#${uid}-stroke)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${uid}-glow)`}
          />
        </svg>
        <span className="infinity-traveler infinity-traveler-a" />
        <span className="infinity-traveler infinity-traveler-b" />
      </span>
    </span>
  );
}
