import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <BrandLogo href="/" size="sm" />
      <h1 className="mt-6 text-2xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-4 text-sm text-emerald-300">
        Back to TestLoop
      </Link>
    </div>
  );
}
