import { COMPANY_LOGO_SRC, COMPANY_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

export function CompanyLogo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={COMPANY_LOGO_SRC}
      alt={COMPANY_NAME}
      width={56}
      height={56}
      className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
    />
  );
}
