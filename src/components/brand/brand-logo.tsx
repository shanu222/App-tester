import { useId } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";

const INFINITY_PATH =
  "M20 40C20 12 52 12 80 40C108 68 140 68 140 40C140 12 108 12 80 40C52 68 20 68 20 40";

const SIZES = {
  sm: { loop: 42, text: "text-[15px] leading-none", tag: false, stack: false },
  md: { loop: 52, text: "text-lg leading-none", tag: false, stack: false },
  lg: { loop: 200, text: "text-4xl leading-none sm:text-5xl", tag: true, stack: true },
} as const;

function FlowingInfinity({
  size,
  glow = false,
  compact,
}: {
  size: number;
  glow?: boolean;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const height = Math.round(size * 0.5);
  const stroke = compact ? 10 : glow ? 7 : 8;

  return (
    <svg
      viewBox="0 0 160 80"
      width={size}
      height={height}
      fill="none"
      aria-hidden
      className="brand-infinity overflow-visible"
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#2f6fed" />
          <stop offset="50%" stopColor="#3ee0c0" />
          <stop offset="100%" stopColor="#12b981" />
        </linearGradient>
        <linearGradient id={`${uid}-flow`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#7db4ff" />
          <stop offset="55%" stopColor="#5ef0c0" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        {glow ? (
          <filter id={`${uid}-glow`} x="-35%" y="-55%" width="170%" height="210%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>
      <path
        d={INFINITY_PATH}
        stroke={`url(#${uid}-base)`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.28"
      />
      <path
        d={INFINITY_PATH}
        pathLength={1}
        className="brand-flow"
        stroke={`url(#${uid}-flow)`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#${uid}-glow)` : undefined}
      />
      <path
        d={INFINITY_PATH}
        pathLength={1}
        className="brand-flow brand-flow-b"
        stroke={`url(#${uid}-flow)`}
        strokeWidth={compact ? 8 : glow ? 5 : 6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {compact ? null : (
        <>
          <circle r={glow ? 4.2 : 3.6} fill="#5b9dff" className="logo-particle">
            <animateMotion dur="2.6s" repeatCount="indefinite" path={INFINITY_PATH} />
          </circle>
          <circle r={glow ? 4.2 : 3.6} fill="#34d399" className="logo-particle">
            <animateMotion dur="2.6s" begin="-1.3s" repeatCount="indefinite" path={INFINITY_PATH} />
          </circle>
        </>
      )}
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  href,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  priority?: boolean;
}) {
  const spec = SIZES[size];
  const mark = (
    <span
      className={cn(
        "brand-logo inline-flex min-w-0",
        spec.stack ? "flex-col items-start gap-3" : "items-center gap-2.5",
      )}
    >
      <FlowingInfinity size={spec.loop} glow={size === "lg"} />
      <span className="min-w-0">
        <span className={cn("brand-word flex items-center font-semibold tracking-tight", spec.text)}>
          <span className="brand-word-test">Test</span>
          <span className="brand-word-loop">L</span>
          <span className="brand-oo mx-[0.06em] inline-flex items-center" aria-hidden>
            <FlowingInfinity size={size === "lg" ? 42 : size === "md" ? 22 : 18} compact />
          </span>
          <span className="brand-word-loop">p</span>
        </span>
        {spec.tag ? (
          <span className="brand-tag mt-2 block max-w-[18rem] text-[11px] font-medium uppercase tracking-[0.18em] text-sky-300/80">
            {SITE_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex min-w-0 items-center" aria-label={`${SITE_NAME} home`}>
      {mark}
    </Link>
  );
}
