import type { ReactNode } from "react";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/site";

export function LegalArticle({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: Array<{ id: string; title: string; content: ReactNode }>;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <p className="text-sm uppercase tracking-[0.18em] text-emerald-300">{SITE_NAME}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-slate-400">Last updated: {LEGAL_UPDATED}</p>
      <p className="mt-6 text-base leading-7 text-slate-300">{description}</p>
      <nav className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5" aria-label="Table of contents">
        <h2 className="text-sm font-medium text-white">Contents</h2>
        <ol className="mt-3 grid gap-2 text-sm text-emerald-300 sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="hover:text-white">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-10 space-y-10">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="text-xl font-semibold text-white">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">{section.content}</div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-slate-500">
        Questions about this page? Email{" "}
        <a className="text-emerald-300 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
