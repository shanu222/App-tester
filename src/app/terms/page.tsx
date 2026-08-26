import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7 text-slate-300">
      <h1 className="text-3xl font-semibold text-white">Terms</h1>
      <p className="mt-4">
        TesterBridge is a tester-exchange operations tool, not a mass-outreach bot. You must use only content and
        accounts you are authorized to access, respect platform rate limits, and obtain human approval before posting
        comments unless an official API and your settings allow otherwise. Do not harass people who decline.
      </p>
      <Link href="/" className="mt-6 inline-block text-teal-300">
        Home
      </Link>
    </div>
  );
}
