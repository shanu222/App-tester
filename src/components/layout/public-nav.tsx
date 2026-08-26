"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm font-medium transition-colors",
              isActive(link.href)
                ? "bg-surface-strong text-slate-900"
                : "text-slate-600 hover:bg-surface hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line-strong text-slate-600 md:hidden"
        aria-expanded={open}
        aria-controls="public-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
      </button>

      {open ? (
        <div
          id="public-mobile-nav"
          className="absolute inset-x-0 top-full z-30 border-b border-line bg-white shadow-overlay md:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-control px-3 py-2.5 text-sm font-medium",
                  isActive(link.href) ? "bg-surface-strong text-slate-900" : "text-slate-600",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
