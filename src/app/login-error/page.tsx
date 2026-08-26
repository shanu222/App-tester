import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { FirebaseLogin } from "@/components/auth/firebase-login";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SITE_NAME } from "@/lib/site";
import { googleOAuthConfigured } from "@/lib/env";
import { firebaseAuthConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: `Sign in | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  CallbackRouteError: "Google signed you in, but TestLoop could not finish creating your account.",
  InvalidCheck: "The sign-in security check expired. Start again from this same address.",
  OAuthCallbackError: "Google rejected the sign-in request.",
  OAuthSignInError: "The Google sign-in request could not be started.",
  UntrustedHost: "This hostname is not trusted by the sign-in configuration.",
  MissingSecret: "The deployment is missing AUTH_SECRET.",
  AccessDenied: "This account is not allowed to sign in.",
};

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;
  const detail = reason ? REASONS[reason] : null;

  return (
    <PublicChrome>
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold">Google sign-in could not start</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {detail ||
            `${SITE_NAME} could not complete Google sign-in on this hostname. Open https://www.testloop.org and try again.`}
        </p>
        {reason ? (
          <p className="mt-2 text-xs text-slate-500">
            Reference: {reason}
            {error && error !== reason ? ` (${error})` : ""}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {googleOAuthConfigured() ? <GoogleSignInButton label="Try Google again" /> : null}
          {firebaseAuthConfigured() ? <FirebaseLogin /> : null}
        </div>
      </main>
    </PublicChrome>
  );
}
