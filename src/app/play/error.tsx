"use client";

import { AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function PlayErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  function retry() {
    try {
      reset();
    } catch {
      // reset() can no-op if the RSC payload is gone; a full navigation recovers.
    }
    window.location.assign("/play");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <BrandLogo href="/dashboard" size="md" />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">Google Play could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            A temporary connection problem stopped this page. No Google Play data was changed. Your TestLoop
            apps and testing requests are unchanged.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" className="w-full" onClick={retry}>
              Try again
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => window.location.assign("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
