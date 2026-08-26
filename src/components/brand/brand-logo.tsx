import Link from "next/link";
import { LOGO_SRC, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const HEIGHT: Record<"sm" | "md" | "lg", string> = {
  sm: "h-16",
  md: "h-[4.75rem]",
  lg: "h-40 sm:h-48",
};

const MAX_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "max-w-[9.5rem]",
  md: "max-w-[12.5rem]",
  lg: "max-w-[18rem] sm:max-w-[22rem]",
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
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt={SITE_NAME}
      width={1024}
      height={1024}
      className={cn("w-auto object-contain object-left", HEIGHT[size], MAX_WIDTH[size])}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
  const mark = <span className="inline-flex rounded-xl bg-white p-1.5">{image}</span>;
  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex min-w-0 items-center" aria-label={`${SITE_NAME} home`}>
      {mark}
    </Link>
  );
}
