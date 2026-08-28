import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/layout/public-chrome";
import { JoinTestForm } from "@/components/test/join-test-form";
import { AppMark } from "@/components/brand/app-mark";
import { getPublicTestingPage } from "@/lib/services/public-testing";
import { NotFoundError } from "@/lib/errors";
import { SITE_NAME } from "@/lib/site";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { InfoPopover } from "@/components/ui/info-popover";
import { slotsLabel } from "@/lib/public-copy";
import { testingTypeExplanation } from "@/lib/campaign-autofill";

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
      description: `Join ${page.appName} testing on ${SITE_NAME}.`,
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
  const explainer = testingTypeExplanation(page.testingType);

  return (
    <PublicChrome>
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Test this app
        </p>
        <div className="mt-4 flex items-start gap-3">
          <AppMark name={page.appName} src={page.iconUrl} size={56} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{page.appName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TestingTypeBadge type={page.testingType} />
              <InfoPopover title={explainer.title}>{explainer.body}</InfoPopover>
            </div>
            <p className="mt-2 text-sm text-muted">
              by {page.developerName}
              {page.country ? ` · ${page.country}` : ""}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-700">
          {slotsLabel(page.remaining, page.targetTesters, page.testersReceived)}
          {page.durationDays ? ` · ${page.durationDays}-day testing period` : ""}
        </p>
        {page.versionLabel ? (
          <p className="mt-1 text-sm text-muted">Version {page.versionLabel}</p>
        ) : null}

        {page.description ? (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold text-slate-900">About this test</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">{page.description}</p>
          </section>
        ) : null}
        {page.instructions ? (
          <section className="mt-6">
            <h2 className="text-[15px] font-semibold text-slate-900">Testing instructions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">{page.instructions}</p>
          </section>
        ) : null}

        <section className="mt-8 border-t border-line pt-8">
          <h2 className="text-base font-semibold text-slate-900">Join Test</h2>
          {page.publicAccessLabel ? (
            <p className="mt-1.5 text-sm text-muted">{page.publicAccessLabel}</p>
          ) : null}
          <JoinTestForm
            slug={page.slug}
            testingType={page.testingType}
            joinKind={page.joinKind}
            publicAccessLabel={page.publicAccessLabel}
          />
        </section>
      </main>
    </PublicChrome>
  );
}
