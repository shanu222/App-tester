import Link from "next/link";
import { InfinityMark } from "@/components/brand/infinity-mark";
import { LOGO_SRC, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const LOGO_HEIGHT: Record<"sm" | "md" | "lg", string> = {
  sm: "h-14",
  md: "h-[4.25rem]",
  lg: "h-44 sm:h-52",
};

const LOGO_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "max-w-[10.5rem]",
  md: "max-w-[13rem]",
  lg: "max-w-[20rem] sm:max-w-[24rem]",
};

const INFINITY_SIZE: Record<"sm" | "md" | "lg", number> = {
  sm: 44,
  md: 54,
  lg: 168,
};

export function BrandLogo({
  size = "md",
  href,
  priority,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  priority?: boolean;
}) {
  const mark = (
    <span
      className={cn(
        "brand-logo inline-flex min-w-0 items-center",
        size === "lg" ? "flex-col items-start gap-4" : "gap-2.5",
      )}
    >
      <span
        className={cn(
          "relative grid place-items-center",
          size === "lg" && "brand-infinity-stage",
        )}
      >
        <InfinityMark size={INFINITY_SIZE[size]} />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt={SITE_NAME}
        width={1024}
        height={1024}
        className={cn(
          "w-auto object-contain object-left drop-shadow-[0_8px_24px_rgba(15,23,42,0.35)]",
          LOGO_HEIGHT[size],
          LOGO_WIDTH[size],
        )}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex min-w-0 items-center" aria-label={`${SITE_NAME} home`}>
      {mark}
    </Link>
  );
}
