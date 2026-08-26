import Link from "next/link";
import { LOGO_SRC, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const HEIGHT: Record<"sm" | "md" | "lg", string> = {
  sm: "h-9",
  md: "h-12",
  lg: "h-[4.5rem]",
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
      width={320}
      height={320}
      className={cn("w-auto max-w-full object-contain object-left", HEIGHT[size])}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
  if (!href) return image;
  return (
    <Link href={href} className="inline-flex min-w-0 items-center" aria-label={`${SITE_NAME} home`}>
      {image}
    </Link>
  );
}
