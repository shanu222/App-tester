import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">TesterBridge</div>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-slate-300">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-slate-950"
          >
            Get started
          </Link>
        </div>
      </div>
      <div className="mt-20 max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-teal-300">Android closed testing operations</p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">
          Find real testers. Exchange testing. Track every test.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          TesterBridge helps Android developers run reciprocal Google Play testing campaigns with human-approved
          outreach, official OAuth integrations, and an honest workflow when a platform API cannot do the job.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-slate-950"
          >
            Create account
          </Link>
          <Link href="/privacy" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm">
            Privacy
          </Link>
        </div>
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ["Authorized sources only", "Facebook Pages via Graph API. Groups API is deprecated — import posts instead of scraping."],
          ["Human approval default", "Replies are generated, then you approve. Conservative rate limits stop spam."],
          ["Play testers via Groups", "Official Android Publisher API supports Google Groups, not Play Console email lists."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
