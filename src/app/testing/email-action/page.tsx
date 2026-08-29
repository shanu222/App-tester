import { BrandLogo } from "@/components/brand/brand-logo";

export default async function EmailActionResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; app?: string }>;
}) {
  const params = await searchParams;
  const ok = params.ok === "1";
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <BrandLogo href="/" size="md" />
      </div>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-xl font-semibold text-slate-900">
          {ok ? "Testing invitation accepted" : "This invitation could not be used"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {ok
            ? `You accepted the TestLoop invitation${params.app ? ` for ${params.app}` : ""}. Continue in Google Play if a download page did not open. Google may require you to sign in. TestLoop cannot verify an Android install from this email click.`
            : params.error || "This invitation link is invalid, expired, or no longer active."}
        </p>
      </main>
    </div>
  );
}
