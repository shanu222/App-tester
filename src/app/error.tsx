"use client";

import { AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <BrandLogo href="/" size="md" />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">This page could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {error.message || "An unexpected error stopped this page from loading. No Google Play data was changed."}
          </p>
          <Button type="button" className="mt-6 w-full" onClick={reset}>
            Try again
          </Button>
        </div>
      </main>
    </div>
  );
}
