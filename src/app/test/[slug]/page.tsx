import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/layout/public-chrome";
import { JoinTestForm } from "@/components/test/join-test-form";
import { AppMark } from "@/components/brand/app-mark";
import { getPublicTestingPage } from "@/lib/services/public-testing";
import { NotFoundError } from "@/lib/errors";
import { SITE_NAME } from "@/lib/site";
import { testingTypeExplanation, testingTypeLabel } from "@/lib/campaign-autofill";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const page = await getPublicTestingPage(slug);
    return {
      title: `Test ${page.appName} | ${SITE_NAME}`,
      description: `Join ${page.trackLabel} for ${page.appName} on ${SITE_NAME}.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: `Testing page | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
}

export default async function PublicTestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let page;
  try {
    page = await getPublicTestingPage(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <PublicChrome>
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Test this app
        </p>
        <div className="mt-4 flex items-start gap-3">
          <AppMark name={page.appName} src={page.iconUrl} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {page.appName}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted">{page.packageName}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-control border border-line bg-surface px-3 py-2.5">
            <dt className="text-xs font-medium text-muted">Developer</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{page.developerName}</dd>
          </div>
          <div className="rounded-control border border-line bg-surface px-3 py-2.5">
            <dt className="text-xs font-medium text-muted">Testing</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{testingTypeLabel(page.testingType)}</dd>
          </div>
          {page.versionLabel ? (
            <div className="rounded-control border border-line bg-surface px-3 py-2.5 sm:col-span-2">
              <dt className="text-xs font-medium text-muted">Version</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{page.versionLabel}</dd>
            </div>
          ) : null}
        </dl>

        {page.description ? (
          <p className="mt-6 text-sm leading-6 text-body">{page.description}</p>
        ) : null}
        {page.instructions ? (
          <p className="mt-3 text-sm leading-6 text-body">{page.instructions}</p>
        ) : null}

        <section className="mt-8 border-t border-line pt-8">
          <h2 className="text-base font-semibold text-slate-900">Join this test</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            {testingTypeExplanation(page.testingType).body}
          </p>
          <JoinTestForm slug={page.slug} testingType={page.testingType} />
        </section>
      </main>
    </PublicChrome>
  );
}
