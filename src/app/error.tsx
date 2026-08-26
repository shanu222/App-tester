"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <BrandLogo size="sm" />
      <h1 className="mt-6 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">{error.message}</p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
