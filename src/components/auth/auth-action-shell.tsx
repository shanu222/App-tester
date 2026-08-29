import { Suspense, type ReactNode } from "react";
import { PublicChrome } from "@/components/layout/public-chrome";
import { FirebaseEmailAction } from "@/components/auth/firebase-email-action";

export function AuthActionShell({ children }: { children?: ReactNode }) {
  return (
    <PublicChrome>
      <main className="mx-auto w-full max-w-md px-4 py-14 sm:px-6 lg:py-20">
        <div className="rounded-card border border-line bg-white p-6 shadow-raised sm:p-7">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            {children ?? <FirebaseEmailAction />}
          </Suspense>
        </div>
      </main>
    </PublicChrome>
  );
}
