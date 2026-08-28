import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CompanyAttribution } from "@/components/brand/company-attribution";
import { PublicNav } from "@/components/layout/public-nav";
import { COMPANY_NAME, COMPANY_URL, CONTACT_EMAIL, PUBLIC_NAV, SITE_TAGLINE } from "@/lib/site";

const APP_PRODUCT_LINKS = [
  { href: "/requests", label: "Discover Testing" },
  { href: "/testing", label: "My Testing" },
  { href: "/dashboard", label: "Developer Dashboard" },
] as const;

export function SiteFooter({ homeHref = "/" }: { homeHref?: string }) {
  const inApp = homeHref !== "/";
  const productLinks = inApp
    ? APP_PRODUCT_LINKS
    : PUBLIC_NAV.filter((item) => item.href !== "/").map((item) => ({ href: item.href, label: item.label }));

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <div>
          <BrandLogo href={homeHref} size="md" />
          <p className="mt-2 text-sm font-medium text-slate-700">{SITE_TAGLINE}</p>
          <div className="mt-4">
            <CompanyAttribution compact />
          </div>
        </div>

        <nav aria-label="Product">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {productLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-slate-600 transition-colors hover:text-slate-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Company</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span className="text-slate-700">{COMPANY_NAME}</span>
            </li>
            <li>
              <a
                href={COMPANY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:underline"
              >
                Visit company website ↗
              </a>
            </li>
            <li>
              <a className="text-slate-600 hover:text-slate-900" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {COMPANY_NAME}
      </div>
    </footer>
  );
}

export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
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
