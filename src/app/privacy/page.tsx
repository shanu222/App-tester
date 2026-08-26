import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7 text-slate-300">
      <h1 className="text-3xl font-semibold text-white">Privacy policy</h1>
      <p className="mt-4">
        TesterBridge collects only the data needed to coordinate reciprocal Android testing: your account profile,
        authorized integration tokens, tester contact details you enter or receive, campaign records, and optional
        in-app telemetry (campaign ID, anonymous tester ID, app version, platform, timestamps).
      </p>
      <p className="mt-3">
        We do not ask for Facebook, Google, Gmail, or Google Play passwords. OAuth tokens and service-account keys are
        encrypted at rest. Facebook Group conversations are not stored unless you paste a specific reply. You can export
        tester data or delete your account from Settings.
      </p>
      <p className="mt-3">
        Disconnecting an integration revokes stored credentials in TesterBridge. Revoke access in Google and Meta
        security settings as well.
      </p>
      <Link href="/" className="mt-6 inline-block text-teal-300">
        Home
      </Link>
    </div>
  );
}
