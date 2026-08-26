import { BrandLogo } from "@/components/brand/brand-logo";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16" aria-busy="true">
      <BrandLogo size="md" />
      <p className="text-sm text-slate-400">Loading TestLoop…</p>
    </div>
  );
}
