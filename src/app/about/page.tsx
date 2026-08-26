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
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          About {SITE_NAME}
        </h1>
        <p className="mt-4 text-lg leading-8 text-body">{SITE_TAGLINE}.</p>
        <div className="mt-8 space-y-4 text-base leading-7 text-body">
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
        <Link
          href="/"
          className="mt-10 inline-block border-t border-line pt-6 text-sm font-medium text-brand hover:underline"
        >
          Back to {SITE_NAME}
        </Link>
      </main>
    </PublicChrome>
  );
}
