import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { Mail, Phone } from "lucide-react";
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
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Contact</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-body">
          For privacy requests, legal questions, trust and safety reports, or account deletion, reach out
          using either channel below.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="group rounded-card border border-line bg-white p-5 shadow-card transition-colors hover:border-brand"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-soft text-brand">
              <Mail className="h-4.5 w-4.5" aria-hidden />
            </span>
            <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Email</h2>
            <p className="mt-1 font-medium text-slate-900 group-hover:text-brand">{CONTACT_EMAIL}</p>
          </a>

          <a
            href={`tel:${CONTACT_PHONE}`}
            className="group rounded-card border border-line bg-white p-5 shadow-card transition-colors hover:border-brand"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-soft text-brand">
              <Phone className="h-4.5 w-4.5" aria-hidden />
            </span>
            <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Phone</h2>
            <p className="mt-1 font-medium text-slate-900 group-hover:text-brand">{CONTACT_PHONE}</p>
          </a>
        </div>

        <div className="mt-8 rounded-card border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-800">
            Signed-in developers can also use in-app Messages and the report/block tools. Never send Google
            passwords or private service-account keys by email.
          </p>
        </div>

        <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand hover:underline">
          Back to {SITE_NAME}
        </Link>
      </main>
    </PublicChrome>
  );
}
