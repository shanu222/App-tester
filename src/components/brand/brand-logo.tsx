import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";

const LEMNISCATE =
  "M20 40C20 12 52 12 80 40C108 68 140 68 140 40C140 12 108 12 80 40C52 68 20 68 20 40";

const SIZES = {
  sm: { text: "text-[15px]", tagline: false },
  md: { text: "text-[17px]", tagline: false },
  lg: { text: "text-2xl sm:text-[28px]", tagline: true },
} as const;

/**
 * The only infinity symbol in the brand. It stands in for the "oo" of TestLoop,
 * so it is sized in em units to keep the same weight and rhythm as the letters.
 */
function InfinityGlyph() {
  return (
    <svg
      viewBox="0 0 160 80"
      fill="none"
      aria-hidden
      className="mx-[0.03em] h-[0.58em] w-[1.16em] translate-y-[0.055em] overflow-visible"
    >
      <path
        d={LEMNISCATE}
        stroke="currentColor"
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  href,
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  /** Accepted for call-site compatibility; the mark is inline SVG so there is nothing to preload. */
  priority?: boolean;
}) {
  const spec = SIZES[size];

  const mark = (
    <span className={cn("inline-flex min-w-0 flex-col", className)}>
      <span className="sr-only">{SITE_NAME}</span>
      <span
        aria-hidden
        className={cn("flex items-center font-semibold tracking-tight text-slate-900", spec.text)}
      >
        TestL
        <span className="text-brand">
          <InfinityGlyph />
        </span>
        p
      </span>
      {spec.tagline ? (
        <span className="mt-1.5 text-xs font-medium text-muted">{SITE_TAGLINE}</span>
      ) : null}
    </span>
  );

  if (!href) return mark;
  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center rounded-control"
      aria-label={`${SITE_NAME} home`}
    >
      {mark}
    </Link>
  );
}
