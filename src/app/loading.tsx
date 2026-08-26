import { BrandLogo } from "@/components/brand/brand-logo";

export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16"
      aria-busy="true"
      role="status"
    >
      <BrandLogo size="lg" />
      <span className="sr-only">Loading TestLoop</span>
    </div>
  );
}
