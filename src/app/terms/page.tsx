import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { LegalArticle } from "@/components/layout/legal-article";
import { CONTACT_EMAIL, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service | ${SITE_NAME}`,
  description: `Terms governing use of ${SITE_NAME}, a developer-to-developer Android testing network. ${SITE_NAME} does not guarantee testers, downloads, reviews, or Google Play approval.`,
  alternates: { canonical: `${SITE_ORIGIN}/terms` },
  openGraph: {
    title: `Terms of Service | ${SITE_NAME}`,
    description: `Legal terms for using ${SITE_NAME}.`,
    url: `${SITE_ORIGIN}/terms`,
    siteName: SITE_NAME,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <PublicChrome>
      <LegalArticle
        title="Terms of Service"
        description={`These Terms of Service (“Terms”) govern access to and use of ${SITE_NAME}, a developer-to-developer app testing network. By creating an account, signing in with Google, or using ${SITE_NAME}, you agree to these Terms. If you do not agree, do not use the service.`}
        sections={[
          {
            id: "acceptance",
            title: "Acceptance of terms",
            content: (
              <p>
                These Terms are an agreement between you and {SITE_NAME}. They apply to the website, developer
                accounts, testing campaigns, messaging, integrations, and related features. Additional product notices
                shown in the service — for example, that an API action failed or that manual Google Group action is
                required — also apply.
              </p>
            ),
          },
          {
            id: "eligibility",
            title: "Eligibility",
            content: (
              <p>
                You must be old enough to form a binding contract and able to use Google Sign-In and, where relevant,
                Google Play testing features under Google’s rules. {SITE_NAME} is intended for app developers and
                similar professionals, not for children. You may use {SITE_NAME} on behalf of a company only if you
                have authority to bind that company.
              </p>
            ),
          },
          {
            id: "accounts",
            title: "Developer accounts and Google Sign-In",
            content: (
              <>
                <p>
                  Every {SITE_NAME} account represents a developer. You sign in with official Google OAuth. You must
                  not attempt to bypass authentication, share your session, or create accounts by automated or
                  deceptive means. You are responsible for activity on your account and for keeping your Google account
                  secure.
                </p>
                <p>
                  You agree to provide accurate developer profile information and to keep it reasonably current.
                  Incomplete profiles may be blocked from creating campaigns or accepting tests. {SITE_NAME} may
                  suspend accounts that appear fraudulent, abusive, or in violation of these Terms.
                </p>
              </>
            ),
          },
          {
            id: "apps",
            title: "Developer-owned applications",
            content: (
              <p>
                You may add only Android applications that you own or are authorized to test and represent. Package
                names, Play Store URLs, testing tracks, and opt-in URLs must be accurate. You must not create fake app
                records, impersonate another developer’s application, or misstate Google Play testing status. Store
                listing URLs and testing/opt-in URLs are different; you must not present a normal Play Store URL as a
                closed-testing opt-in link unless that is actually the configured testing URL.
              </p>
            ),
          },
          {
            id: "campaigns",
            title: "Testing campaigns",
            content: (
              <p>
                Publishing a testing request makes selected campaign information visible to other signed-in developers.
                You are responsible for the content of your campaign, tester requirements, and testing instructions.
                {SITE_NAME} does not guarantee that any developer will see, accept, or complete your campaign, or that
                you will receive any particular number of testers.
              </p>
            ),
          },
          {
            id: "reciprocal",
            title: "Reciprocal testing expectations",
            content: (
              <p>
                {SITE_NAME} encourages developers to test one another’s apps. Reciprocal testing is a request and
                matching workflow, not a contract for a fixed number of testers, installs, or reviews. A developer who
                tests your app is not automatically required to receive testers from you unless both sides accept a
                reciprocal request through the product. You should treat other developers professionally and must not
                coerce, harass, or mislead anyone into testing.
              </p>
            ),
          },
          {
            id: "participation",
            title: "Tester participation",
            content: (
              <p>
                If you accept a testing request, you agree to test in good faith according to the campaign instructions
                you are shown. Your Google Play Gmail is shared with the app owner only after you explicitly confirm.
                You must not provide an email you are not authorized to use. Campaign owners must use consented emails
                only to add testers to the relevant Play testing track or Google Group and related testing
                communication, not for unrelated marketing.
              </p>
            ),
          },
          {
            id: "responsibilities",
            title: "User responsibilities",
            content: (
              <ul className="list-disc space-y-1 pl-5">
                <li>Comply with these Terms, applicable law, and Google Play Developer policies.</li>
                <li>Use official Google authorization only; never provide Google passwords to {SITE_NAME}.</li>
                <li>Keep service-account keys and OAuth credentials confidential and scoped to your own account.</li>
                <li>Respect other developers’ privacy, including tester emails you receive through consent.</li>
                <li>Submit only truthful feedback and status updates. Do not fabricate testing activity or downloads.</li>
              </ul>
            ),
          },
          {
            id: "prohibited",
            title: "Prohibited activities",
            content: (
              <>
                <p>You must not:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>spam, scrape, or bulk-create accounts, campaigns, or messages;</li>
                  <li>harass, threaten, or dox other developers;</li>
                  <li>commit fraud, impersonation, or fake testing activity;</li>
                  <li>manipulate reputation, match scores, or campaign progress with false events;</li>
                  <li>attempt to access another developer’s private credentials, tester lists, or Play Console data;</li>
                  <li>upload malware, or use {SITE_NAME} to distribute unauthorized software;</li>
                  <li>interfere with the service, bypass rate limits, or probe for vulnerabilities except through a coordinated disclosure to {CONTACT_EMAIL}; or</li>
                  <li>use {SITE_NAME} in a way that violates Google, Meta, or other third-party terms applicable to features you enable.</li>
                </ul>
              </>
            ),
          },
          {
            id: "play-policies",
            title: "Google Play policy compliance",
            content: (
              <p>
                You remain solely responsible for complying with Google Play Developer Program Policies, testing-track
                rules, data-safety disclosures, and any other Google requirements. {SITE_NAME} may help you coordinate
                testers and, where you configure an official API, attempt to add testers to a Google Group. {SITE_NAME}{" "}
                does not determine Google Play eligibility, production access, review outcomes, ratings, or policy
                decisions. Success states in {SITE_NAME} reflect {SITE_NAME} records or API responses, not a promise
                from Google.
              </p>
            ),
          },
          {
            id: "ip",
            title: "Intellectual property",
            content: (
              <p>
                {SITE_NAME} and its branding, software, and original content are owned by {SITE_NAME} or its licensors.
                You retain ownership of your apps, campaign copy, and feedback you submit. You grant {SITE_NAME} a
                limited license to host and display that content as needed to operate the network you use — for example
                showing a published testing request to other developers.
              </p>
            ),
          },
          {
            id: "ugc",
            title: "User-generated content",
            content: (
              <p>
                Profiles, app listings, campaign descriptions, messages, and feedback are user-generated. You represent
                that you have the rights to post them and that they are not unlawful, infringing, or deceptive.{" "}
                {SITE_NAME} may remove content or restrict accounts that appear to violate these Terms, without a duty
                to monitor all content in advance.
              </p>
            ),
          },
          {
            id: "third-party",
            title: "Third-party services",
            content: (
              <p>
                Google Sign-In, Google Play, Google Groups, optional Gmail, optional Meta integrations, hosting
                providers, and external testing links are third-party services. Your use of them is subject to those
                providers’ terms and privacy policies. {SITE_NAME} is not those providers and does not control Play
                Console, Google Group membership tools you use manually, or the availability of Google APIs.
              </p>
            ),
          },
          {
            id: "suspension",
            title: "Account suspension and termination",
            content: (
              <p>
                {SITE_NAME} may suspend or terminate access, including for abuse, fraud, spam, security risk, or
                violation of these Terms. You may stop using {SITE_NAME} at any time and may request account deletion as
                described in the Privacy Policy. Provisions that by their nature should survive — including
                intellectual property, disclaimers, limitation of liability, and indemnification — will survive
                termination.
              </p>
            ),
          },
          {
            id: "availability",
            title: "Platform availability",
            content: (
              <p>
                {SITE_NAME} is provided as a production web application, but we do not guarantee uninterrupted or
                error-free operation. Features that depend on Google or other APIs may be unavailable, rate-limited, or
                limited by those APIs. When automation cannot complete an operation, the product is designed to say so
                rather than display a fake success.
              </p>
            ),
          },
          {
            id: "no-guarantee",
            title: "No guaranteed testing results",
            content: (
              <p>
                {SITE_NAME} is a marketplace and network connecting developers for app testing. It does not guarantee
                that you will receive testers, that testers will install or use your app, that you will receive
                downloads, reviews, or ratings, or that Google will approve your app, closed testing, or production
                access. Reputation scores and match percentages are based on {SITE_NAME} activity rules, not on Google
                Play Console statistics unless an official API actually returns that data.
              </p>
            ),
          },
          {
            id: "disclaimers",
            title: "Disclaimers",
            content: (
              <p>
                {SITE_NAME} is provided “as is” and “as available.” To the maximum extent permitted by law, {SITE_NAME}{" "}
                disclaims warranties of merchantability, fitness for a particular purpose, title, and non-infringement,
                and disclaims any warranty that the service will meet your testing quotas or Google Play requirements.
                Some jurisdictions do not allow certain disclaimers; in those places, this section applies to the full
                extent allowed.
              </p>
            ),
          },
          {
            id: "liability",
            title: "Limitation of liability",
            content: (
              <p>
                To the maximum extent permitted by law, {SITE_NAME} and its operators will not be liable for indirect,
                incidental, special, consequential, or punitive damages, or for lost profits, lost data, lost testers,
                failed Play reviews, or business interruption, even if advised of the possibility. To the extent
                liability cannot be excluded, it is limited to the greater of the amount you paid {SITE_NAME} for the
                service in the three months before the claim (if any) or fifty U.S. dollars. These limits are a
                fundamental part of the bargain for a developer network that may be used without a paid fee.
              </p>
            ),
          },
          {
            id: "indemnity",
            title: "Indemnification",
            content: (
              <p>
                You will defend and indemnify {SITE_NAME} and its operators against claims, damages, and reasonable
                legal fees arising from your apps, campaign content, misuse of tester emails, violation of Google Play
                or other third-party rules, or your violation of these Terms, except to the extent caused by{" "}
                {SITE_NAME}’s willful misconduct.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes to these Terms",
            content: (
              <p>
                We may update these Terms from time to time. The “Last updated” date will change when we do. Continued
                use after an update constitutes acceptance of the revised Terms, except where applicable law requires
                otherwise.
              </p>
            ),
          },
          {
            id: "contact",
            title: "Contact",
            content: (
              <p>
                Questions about these Terms:{" "}
                <a className="text-teal-300" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                . The main {SITE_NAME} website is{" "}
                <a className="text-teal-300" href={SITE_ORIGIN}>
                  {SITE_ORIGIN}
                </a>
                .
              </p>
            ),
          },
        ]}
      />
    </PublicChrome>
  );
}
