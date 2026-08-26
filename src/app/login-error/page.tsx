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

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configuration = !error || error === "Configuration";

  return (
    <PublicChrome>
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Google sign-in could not start</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {configuration
            ? `${SITE_NAME} could not build a Google callback for this hostname. Open https://www.testloop.org or https://app-tester-three.vercel.app and try again.`
            : `Google returned ${error}. Try signing in again from this same address.`}
        </p>
        <div className="mt-8 space-y-4 text-left">
          {googleOAuthConfigured() ? (
            <div className="flex justify-center">
              <GoogleSignInButton label="Try Google again" />
            </div>
          ) : null}
          {firebaseAuthConfigured() ? <FirebaseLogin /> : null}
        </div>
      </main>
    </PublicChrome>
  );
}
