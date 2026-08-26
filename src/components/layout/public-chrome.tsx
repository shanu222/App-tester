import type { ReactNode } from "react";
import Link from "next/link";
import { CONTACT_EMAIL, PUBLIC_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold tracking-tight">{SITE_NAME}</div>
          <p className="mt-1 text-xs text-slate-500">{SITE_TAGLINE}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">{SITE_NAME}</div>
            <div className="truncate text-[11px] text-slate-400">{SITE_TAGLINE}</div>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-4 text-sm text-slate-300">
            <Link href="/" className="hover:text-white">
              Home
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
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
