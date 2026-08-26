import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicNav } from "@/components/layout/public-nav";
import { CONTACT_EMAIL, CONTACT_PHONE, PUBLIC_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function SiteFooter({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
        <div>
          <BrandLogo href={homeHref} size="md" />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">{SITE_TAGLINE}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <dd>
                <a className="font-medium text-brand hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Phone</dt>
              <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <dd>
                <a className="font-medium text-brand hover:underline" href={`tel:${CONTACT_PHONE}`}>
                  {CONTACT_PHONE}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Product</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href === "/" ? homeHref : item.href}
                  className="text-slate-600 transition-colors hover:text-slate-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* sticky establishes the containing block for the mobile dropdown */}
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo href="/" size="md" />
          <PublicNav />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
