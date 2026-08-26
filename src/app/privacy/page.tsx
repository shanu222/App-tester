import type { Metadata } from "next";
import { PublicChrome } from "@/components/layout/public-chrome";
import { LegalArticle } from "@/components/layout/legal-article";
import { CONTACT_EMAIL, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, stores, and shares information for its developer-to-developer Android testing network, including Google Sign-In.`,
  alternates: { canonical: `${SITE_ORIGIN}/privacy` },
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: `Privacy practices for ${SITE_NAME}, a developer-to-developer app testing platform.`,
    url: `${SITE_ORIGIN}/privacy`,
    siteName: SITE_NAME,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <PublicChrome>
      <LegalArticle
        title="Privacy Policy"
        description={`${SITE_NAME} is a developer-to-developer app testing platform. This Privacy Policy explains what information we collect when you use ${SITE_NAME}, how we use it, and the choices available to you. It describes the product as it actually operates today. It does not claim certifications, registrations, or compliance frameworks that ${SITE_NAME} has not independently verified.`}
        sections={[
          {
            id: "who-we-are",
            title: "Who we are",
            content: (
              <>
                <p>
                  {SITE_NAME} helps software developers, Android developers, indie developers, startup founders, and
                  development teams create testing campaigns, accept other developers’ testing requests, and coordinate
                  Google Play testing participation. {SITE_NAME} is a network connecting developers. It is not a public
                  tester marketplace for consumers, and it is not Google, Google Play, or a Google Play Console
                  substitute.
                </p>
                <p>
                  For privacy questions, contact{" "}
                  <a className="text-teal-300" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </>
            ),
          },
          {
            id: "information-we-collect",
            title: "Information we collect",
            content: (
              <>
                <p>
                  We collect information that you provide, information we receive from Google when you sign in, and
                  information created by your use of the platform. We do not ask for, and do not store, your Google
                  password.
                </p>
                <p>
                  <strong className="text-slate-100">Google account information used for authentication.</strong> When
                  you choose Continue with Google, Google may share the Google account email address, name, and profile
                  photo associated with the account you select. {SITE_NAME} uses this information to create and maintain
                  your developer account. We do not use Google Sign-In to read your Gmail inbox, contacts, or Drive.
                </p>
                <p>
                  <strong className="text-slate-100">Developer profile information.</strong> After sign-in you may
                  provide a full name, developer or company name, country, city, developer type, years of experience,
                  platforms, technologies, website, GitHub, LinkedIn, bio, profile photo, and an optional Google Play
                  testing Gmail. Incomplete profiles cannot create testing campaigns or accept tests.
                </p>
                <p>
                  <strong className="text-slate-100">Application information.</strong> If you add an Android app,{" "}
                  {SITE_NAME} stores details you submit such as app name, package name, Google Play Store URL, optional
                  testing or opt-in URL, icon, description, testing track or type, tester targets, and related
                  configuration. {SITE_NAME} does not create fake app records and does not treat a Play Store listing
                  URL as a testing opt-in URL.
                </p>
                <p>
                  <strong className="text-slate-100">Testing campaign information.</strong> Campaign records may include
                  the selected app, testing type, target tester count, duration, description, testing instructions,
                  publication status, Google Group configuration if you add one, and campaign progress derived from
                  recorded platform activity.
                </p>
                <p>
                  <strong className="text-slate-100">Tester participation information.</strong> If you accept another
                  developer’s testing request, {SITE_NAME} records the participation and its status. Your Google Play
                  testing email is collected only after you explicitly confirm and consent to share it with that
                  campaign’s owner. Other developers do not see your Google email on public profiles or the request
                  feed. Campaign owners can see a consented testing email so they can add you as a tester.
                </p>
                <p>
                  <strong className="text-slate-100">Google Play and testing-related integrations.</strong> If you
                  choose to connect a Google Play Developer API service account, optional Gmail sending, Google
                  Workspace / Groups automation, or another supported integration, {SITE_NAME} stores the credentials
                  and connection status you provide so the integration can run for your account. Play service-account
                  keys and OAuth tokens are encrypted at rest and are not returned in ordinary frontend responses.
                  Connecting an integration is optional. If an official API cannot complete an action, {SITE_NAME}{" "}
                  reports the failure or a manual fallback. It does not invent a successful Play or Google Group
                  result.
                </p>
                <p>
                  <strong className="text-slate-100">Messages, feedback, reports, and activity.</strong> {SITE_NAME}{" "}
                  stores developer-to-developer messages you send, testing feedback you submit, in-app notifications,
                  reports or blocks you file, and activity logs needed to operate campaigns and support trust and
                  safety.
                </p>
                <p>
                  <strong className="text-slate-100">Optional in-app telemetry.</strong> If a developer’s own application
                  is configured to call {SITE_NAME}’s telemetry endpoint, {SITE_NAME} may store a campaign token, an
                  anonymous tester identifier, optional app version, optional platform, and timestamps. This is an
                  activity signal from that app. It is not a Google Play per-account download confirmation.
                </p>
                <p>
                  <strong className="text-slate-100">Technical information.</strong> When you visit {SITE_NAME}, our
                  hosting and infrastructure providers may process standard request data such as IP address, browser
                  type, device or user-agent information, and timestamps in order to operate, secure, and diagnose the
                  service. {SITE_NAME} does not currently operate a separate advertising pixel or third-party marketing
                  analytics product on these pages.
                </p>
              </>
            ),
          },
          {
            id: "how-we-use",
            title: "How information is used",
            content: (
              <>
                <p>We use the information described above to:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>authenticate developers with Google Sign-In and maintain developer accounts;</li>
                  <li>display developer profiles, apps, and published testing requests to other signed-in developers;</li>
                  <li>operate testing campaigns, accept/consent flows, reciprocal requests, and participation status;</li>
                  <li>share a testing Gmail with a campaign owner only after the tester’s explicit confirmation;</li>
                  <li>attempt Google Play or Google Group actions you configure, or show an honest manual fallback;</li>
                  <li>calculate reputation and match scores from recorded platform activity;</li>
                  <li>send in-app notifications you have not disabled in Settings;</li>
                  <li>protect the service against spam, abuse, fraud, and unauthorized access; and</li>
                  <li>comply with law and enforce these terms where applicable.</li>
                </ul>
                <p>
                  {SITE_NAME} does not sell your personal information. {SITE_NAME} does not use Google Sign-In data to
                  place advertisements.
                </p>
              </>
            ),
          },
          {
            id: "storage-and-protection",
            title: "How information is stored and protected",
            content: (
              <p>
                Account, profile, app, campaign, participation, message, and integration records are stored in{" "}
                {SITE_NAME}’s application database. Integration credentials such as Play service-account material are
                encrypted before storage. Session authentication uses a signed session cookie rather than storing your
                Google password. No security measure is perfect. You should use a Google account you control, grant
                integrations only the access you intend, and disconnect credentials you no longer need.
              </p>
            ),
          },
          {
            id: "sharing",
            title: "When information may be shared",
            content: (
              <>
                <p>We may share information:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    with other developers, limited to what the product is designed to show — for example public
                    developer profile fields, published campaign details, and a testing Gmail after you consent;
                  </li>
                  <li>with Google or other providers when you connect an official integration and {SITE_NAME} calls that API on your behalf;</li>
                  <li>with infrastructure providers that host the website, database, and application runtime;</li>
                  <li>if we believe disclosure is required by law, legal process, or to protect developers and the platform; and</li>
                  <li>in connection with a genuine business transfer, if one occurs, subject to this policy or successor notice.</li>
                </ul>
              </>
            ),
          },
          {
            id: "isolation",
            title: "Isolation of private information",
            content: (
              <p>
                {SITE_NAME} is multi-tenant. Private developer information is associated with the owning account.
                Developer A must not be able to access Developer B’s Google Play credentials, private tester emails,
                private campaign management tools, or private Play Console data except where the product’s intended
                workflow explicitly shares information — for example after a tester consents to provide a Gmail to a
                campaign owner. Public profiles and the testing-request feed are not intended to display Google emails,
                API credentials, or service-account private keys.
              </p>
            ),
          },
          {
            id: "your-choices",
            title: "Your choices and account deletion",
            content: (
              <>
                <p>
                  You can update developer profile fields, manage apps and campaigns, disconnect supported
                  integrations, and adjust certain notification preferences while signed in. Settings currently include
                  an export of certain tester, campaign, app, and related records associated with your account.
                </p>
                <p>
                  To request deletion of your {SITE_NAME} account and associated personal data, email{" "}
                  <a className="text-teal-300" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                  . We may retain limited records where we have a legitimate need, such as security, dispute
                  resolution, or legal compliance. Disconnecting Google access in your Google Account settings will
                  stop future Google Sign-In from that authorization; you may also need to contact us to delete the{" "}
                  {SITE_NAME} account itself. If you connected Play or other credentials, disconnect them in {SITE_NAME}{" "}
                  and revoke them in the relevant Google Cloud or Play Console settings.
                </p>
              </>
            ),
          },
          {
            id: "retention",
            title: "Data retention",
            content: (
              <p>
                We retain account, campaign, participation, and related records for as long as the account remains
                active and as reasonably needed to operate the network, resolve disputes, and maintain security logs.
                Optional telemetry events are retained in connection with the relevant campaign. When an account is
                deleted upon request, we delete or de-identify personal data we no longer need, except for information
                we must keep for legal or security reasons.
              </p>
            ),
          },
          {
            id: "cookies",
            title: "Cookies and session technologies",
            content: (
              <p>
                {SITE_NAME} uses cookies and similar technologies that are necessary to keep you signed in, protect
                authentication flows (including OAuth state), and operate the website. These include session cookies
                used by Google Sign-In. {SITE_NAME} does not currently use those session cookies to run a separate
                advertising profile. If you block cookies, sign-in and other authenticated features may not work.
              </p>
            ),
          },
          {
            id: "third-parties",
            title: "Third-party services and integrations",
            content: (
              <p>
                {SITE_NAME} relies on third parties to provide the product, including Google Sign-In / Google Identity,
                Google Play Developer API and related Google APIs when you connect them, optional Gmail sending via
                official Google OAuth, optional Meta/Facebook connections if you enable them, and the hosting, database,
                and deployment providers that run the application. Those providers process information according to
                their own policies. {SITE_NAME} is not responsible for third-party sites or consoles you open from
                testing links, Play Store URLs, or Google Group pages.
              </p>
            ),
          },
          {
            id: "google-sign-in",
            title: "Google Sign-In",
            content: (
              <p>
                Continue with Google uses Google’s official OAuth process. {SITE_NAME} requests identity information
                needed to create a developer account. We do not request your Google password. Google user data received
                through Sign-In is used to authenticate you, display your account identity, and operate your {SITE_NAME}{" "}
                developer profile. Testing Gmail used for Google Play closed testing is a separate, explicit consent
                step after you accept a campaign; it is not silently taken from Google Sign-In without that
                confirmation.
              </p>
            ),
          },
          {
            id: "security",
            title: "Security practices",
            content: (
              <p>
                {SITE_NAME} uses authenticated sessions, authorization checks that scope records to the owning
                developer, encrypted storage for integration credentials, and HTTPS in production deployments. We do
                not claim ISO, SOC, or other third-party security certifications in this policy. You remain responsible
                for the security of your Google account, Play Console access, and any service-account keys you upload.
              </p>
            ),
          },
          {
            id: "children",
            title: "Children’s privacy",
            content: (
              <p>
                {SITE_NAME} is intended for developers and other adults who can form a binding contract and who are
                permitted to use Google Play developer and testing features. It is not directed to children under 13,
                and we do not knowingly collect personal information from children. If you believe a child has provided
                personal information, contact {CONTACT_EMAIL} so we can take appropriate steps.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes to this Privacy Policy",
            content: (
              <p>
                We may update this Privacy Policy as {SITE_NAME} changes. The “Last updated” date at the top of this
                page will change when we do. Continued use of {SITE_NAME} after an update means you should review the
                revised policy. If a change is material, we may provide additional notice through the service where
                reasonable.
              </p>
            ),
          },
          {
            id: "contact",
            title: "Contact",
            content: (
              <p>
                Privacy requests, including access or deletion requests, can be sent to{" "}
                <a className="text-teal-300" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                . You can also return to the main {SITE_NAME} website at{" "}
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
