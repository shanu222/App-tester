import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { CONTACT_EMAIL, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: `Contact | ${SITE_NAME}`,
  description: `Contact ${SITE_NAME} about developer accounts, privacy, or these Terms.`,
  alternates: { canonical: `${SITE_ORIGIN}/contact` },
  openGraph: {
    title: `Contact | ${SITE_NAME}`,
    url: `${SITE_ORIGIN}/contact`,
    siteName: SITE_NAME,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <PublicChrome>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-teal-300">{SITE_NAME}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-4 text-slate-300">
          For privacy requests, legal questions, trust and safety reports, or account deletion requests, email{" "}
          <a className="text-teal-300" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Signed-in developers can also use in-app Messages and report/block tools. {SITE_NAME} does not provide phone
          support from this page. Do not send Google passwords or private service-account keys by email.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-teal-300">
          Back to {SITE_NAME}
        </Link>
      </main>
    </PublicChrome>
  );
}
