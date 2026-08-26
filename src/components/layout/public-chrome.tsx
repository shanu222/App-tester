import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CONTACT_EMAIL, CONTACT_PHONE, PUBLIC_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function SiteFooter({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div>
          <BrandLogo href={homeHref} size="md" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{SITE_TAGLINE}</p>
          <p className="mt-4 text-sm text-slate-300">
            Email:{" "}
            <a className="text-emerald-300 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Phone:{" "}
            <a className="text-emerald-300 hover:underline" href={`tel:${CONTACT_PHONE}`}>
              {CONTACT_PHONE}
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-2 text-sm text-slate-400" aria-label="Footer">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href === "/" ? homeHref : item.href}
              className="hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        {SITE_NAME}
      </div>
    </footer>
  );
}

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <BrandLogo href="/" size="md" priority />
          <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex" aria-label="Public">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </nav>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200">
              Menu
            </summary>
            <nav
              className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300 shadow-lg"
              aria-label="Public"
            >
              <div className="flex flex-col gap-2">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </div>
            </nav>
          </details>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
