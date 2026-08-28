import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { CompanyAboutBlurb } from "@/components/brand/company-attribution";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { InfoModal } from "@/components/ui/info-modal";
import Link from "next/link";

export const metadata: Metadata = {
  title: `About | ${SITE_NAME}`,
  description: `${SITE_NAME} is a professional platform for discovering, joining and managing software testing opportunities.`,
  alternates: { canonical: `${SITE_ORIGIN}/about` },
};

export default function AboutPage() {
  return (
    <PublicChrome>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">{SITE_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Professional testing platform
        </h1>
        <p className="mt-4 text-lg leading-8 text-body">
          Discover, join and manage software testing opportunities — with Google Play as the source of truth.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <InfoModal title="What is Open Testing?" label="Open Testing">
            Anyone with the testing link can join through Google Play. TestLoop does not manage an individual tester
            email list for open testing.
          </InfoModal>
          <InfoModal title="What is Closed Testing?" label="Closed Testing">
            Closed testing uses a limited tester list or a Google Group configured in Play Console. TestLoop records
            the tester request and shows the developer what Play Console still requires.
          </InfoModal>
          <InfoModal title="What is Internal Testing?" label="Internal Testing">
            Internal testing is a private Play track with Google’s own limits. TestLoop never claims a tester was added
            unless Google Play actually confirms it.
          </InfoModal>
        </div>

        <CompanyAboutBlurb className="mt-10" />

        <Link href="/" className="mt-10 inline-block text-sm font-medium text-brand hover:underline">
          Back to {SITE_NAME}
        </Link>
      </main>
    </PublicChrome>
  );
}
