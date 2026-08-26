import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <BrandLogo href="/" size="md" />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-strong text-slate-500">
            <FileQuestion className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">Error 404</p>
          <h1 className="mt-1.5 text-xl font-semibold text-slate-900">Page not found</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            The page you are looking for was moved, removed, or never existed.
          </p>
          <Link href="/" className="mt-6 block">
            <Button className="w-full">Back to TestLoop</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
