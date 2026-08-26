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
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">{SITE_NAME}</p>
      <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
      <p className="mt-6 text-base leading-7 text-body">{description}</p>

      <nav
        className="mt-8 rounded-card border border-line bg-surface p-5"
        aria-label="Table of contents"
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Contents</h2>
        <ol className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="font-medium text-brand hover:underline">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-body">{section.content}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Questions about this page? Email{" "}
        <a className="font-medium text-brand hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
