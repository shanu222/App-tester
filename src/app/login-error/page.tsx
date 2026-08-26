import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PublicChrome } from "@/components/layout/public-chrome";
import { FirebaseLogin } from "@/components/auth/firebase-login";
import { SITE_NAME } from "@/lib/site";
import { firebaseAuthConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: `Sign in | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  CredentialsSignin: "Your Firebase sign-in was not accepted. Sign in again to get a fresh token.",
  CallbackRouteError: `Firebase verified you, but ${SITE_NAME} could not finish setting up your account.`,
  AccessDenied: "This account is not allowed to sign in.",
  MissingSecret: "The deployment is missing AUTH_SECRET.",
  UntrustedHost: "This hostname is not trusted by the sign-in configuration.",
  SessionTokenError: "Your session could not be read. Sign in again.",
};

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;
  const detail = reason ? REASONS[reason] : null;
  const signInReady = firebaseAuthConfigured();

  return (
    <PublicChrome>
      <main className="mx-auto w-full max-w-md px-4 py-14 sm:px-6 lg:py-20">
        <div className="rounded-card border border-line bg-white p-6 shadow-raised sm:p-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
            Sign-in could not be completed
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {detail || `${SITE_NAME} could not complete sign-in. Try again below.`}
          </p>

          {reason ? (
            <p className="mt-4 rounded-control border border-line bg-surface px-3 py-2 font-mono text-xs text-slate-600">
              Reference: {reason}
              {error && error !== reason ? ` (${error})` : ""}
            </p>
          ) : null}

          <div className="mt-6">
            {signInReady ? (
              <FirebaseLogin />
            ) : (
              <p className="rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Sign-in is not configured on this deployment.
              </p>
            )}
          </div>
        </div>
      </main>
    </PublicChrome>
  );
}
