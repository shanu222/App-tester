import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { SITE_NAME, SITE_ORIGIN, SITE_TAGLINE } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: `About | ${SITE_NAME}`,
  description: `${SITE_NAME} is a developer-to-developer mobile app testing network.`,
  alternates: { canonical: `${SITE_ORIGIN}/about` },
};

export default function AboutPage() {
  return (
    <PublicChrome>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">About {SITE_NAME}</h1>
        <p className="mt-4 text-lg leading-7 text-slate-300">{SITE_TAGLINE}.</p>
        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-400">
          <p>
            {SITE_NAME} is a professional network for Android developers, indie teams, and startups who need closed
            testing support from other developers — and who can offer testing in return.
          </p>
          <p>
            Developers sign in with Google, complete a profile, publish a testing request, and accept requests from
            others. A Google Play testing Gmail is shared only after explicit consent. Google Play and Google Group
            automation run only when a developer has connected the official APIs; otherwise {SITE_NAME} shows a manual
            fallback instead of a fake success.
          </p>
          <p>
            {SITE_NAME} does not guarantee testers, downloads, reviews, ratings, or Google Play approval. Reputation
            scores are calculated from recorded platform activity, not invented statistics.
          </p>
        </div>
        <Link href="/" className="mt-8 inline-block text-sm text-emerald-300">
          Back to {SITE_NAME}
        </Link>
      </main>
    </PublicChrome>
  );
}
