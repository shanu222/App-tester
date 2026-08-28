import { env } from "@/lib/env";

const BRAND = "#2563eb";

export function emailButton(href: string, label: string) {
  const safeHref = href.replace(/"/g, "");
  return `<p style="margin:24px 0"><a href="${safeHref}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">${label}</a></p>`;
}

export function wrapEmail(bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
          <tr>
            <td style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND}">TestLoop</td>
          </tr>
          <tr>
            <td style="padding-top:16px;font-size:15px;line-height:1.6">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #e2e8f0">
              TestLoop<br>A product of Resilience Technologies Labs
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(token: string) {
  const href = `${env.appUrl.replace(/\/$/, "")}/notifications/verify?token=${encodeURIComponent(token)}`;
  const html = wrapEmail(
    `<p>You requested to receive TestLoop notifications at this email address.</p>${emailButton(href, "Verify Email")}<p style="color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>`,
  );
  const text = `You requested to receive TestLoop notifications at this email address.\n\nVerify Email:\n${href}\n`;
  return { subject: "Verify your TestLoop notification email", html, text };
}

export function testNotificationEmail() {
  const html = wrapEmail(`<p>Your TestLoop email notifications are working correctly.</p>`);
  return {
    subject: "TestLoop Notification Test",
    html,
    text: "Your TestLoop email notifications are working correctly.",
  };
}

export function testerJoinedEmail(input: {
  appName: string;
  testingTypeLabel: string;
  testerName?: string | null;
  testerEmail?: string | null;
  requestedAt?: Date | string | null;
  testerStatus: string;
  testerCount?: number;
  targetTesters?: number;
  trackLabel?: string;
  actionRequired?: string | null;
  campaignUrl: string;
  playConsoleUrl?: string | null;
}) {
  const requested =
    input.requestedAt != null
      ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
          typeof input.requestedAt === "string" ? new Date(input.requestedAt) : input.requestedAt,
        )
      : null;
  const emailBox = input.testerEmail
    ? `<p style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
        <span style="display:block;font-size:12px;color:#64748b;margin-bottom:8px">Copy Tester Email</span>
        <span style="font-size:18px;font-family:ui-monospace,Consolas,monospace;font-weight:600;color:#0f172a">${escapeHtml(input.testerEmail)}</span>
      </p>`
    : "";
  const play = input.playConsoleUrl ? emailButton(input.playConsoleUrl, "Open Google Play Console") : "";
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">New Tester Request — ${escapeHtml(input.appName)}</h1>
    <p>This tester has requested access to your Google Play test. Add the tester using the email address below if your testing track supports individual testers.</p>
    <p>
      <strong>App:</strong> ${escapeHtml(input.appName)}<br>
      <strong>Testing type:</strong> ${escapeHtml(input.testingTypeLabel)}<br>
      ${input.testerName ? `<strong>Tester:</strong> ${escapeHtml(input.testerName)}<br>` : ""}
      ${input.testerEmail ? `<strong>Google Play email:</strong> ${escapeHtml(input.testerEmail)}<br>` : ""}
      ${requested ? `<strong>Requested:</strong> ${escapeHtml(requested)}<br>` : ""}
      <strong>Status:</strong> Waiting for Developer
    </p>
    ${emailBox}
    ${emailButton(input.campaignUrl, "Open TestLoop")}
    ${play}`,
  );
  const text = [
    `New Tester Request — ${input.appName}`,
    "",
    "This tester has requested access to your Google Play test. Add the tester using the email address below if your testing track supports individual testers.",
    "",
    `App: ${input.appName}`,
    `Testing type: ${input.testingTypeLabel}`,
    input.testerName ? `Tester: ${input.testerName}` : null,
    input.testerEmail ? `Google Play email: ${input.testerEmail}` : null,
    requested ? `Requested: ${requested}` : null,
    "Status: Waiting for Developer",
    "",
    `Open TestLoop: ${input.campaignUrl}`,
    input.playConsoleUrl ? `Open Google Play Console: ${input.playConsoleUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `New Tester Request — ${input.appName}`, html, text };
}

export function testerApprovedEmail(input: {
  appName: string;
  testingTypeLabel: string;
  durationDays: number;
  developerName: string;
  testingUrl: string | null;
  groupJoinUrl: string | null;
  dashboardUrl: string;
}) {
  const group = input.groupJoinUrl
    ? `<p>Join the Google Group with the Google account you use on Google Play. After joining, open the testing link.</p>${emailButton(input.groupJoinUrl, "Join Google Group")}`
    : "";
  const play = input.testingUrl
    ? emailButton(input.testingUrl, "Open Google Play Testing")
    : emailButton(input.dashboardUrl, "Open TestLoop");
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">You're Added as a Tester — ${escapeHtml(input.appName)}</h1>
    <p>You're now approved to test ${escapeHtml(input.appName)}.</p>
    <p>
      <strong>App:</strong> ${escapeHtml(input.appName)}<br>
      <strong>Testing:</strong> ${escapeHtml(input.testingTypeLabel)}<br>
      <strong>Testing duration:</strong> ${input.durationDays} days<br>
      <strong>Developer:</strong> ${escapeHtml(input.developerName)}
    </p>
    ${group}
    ${play}`,
  );
  const text = [
    `You're Added as a Tester — ${input.appName}`,
    "",
    `You're now approved to test ${input.appName}.`,
    "",
    `App: ${input.appName}`,
    `Testing: ${input.testingTypeLabel}`,
    `Testing duration: ${input.durationDays} days`,
    `Developer: ${input.developerName}`,
    "",
    input.groupJoinUrl ? `Join Google Group: ${input.groupJoinUrl}` : null,
    input.testingUrl ? `Open Google Play Testing: ${input.testingUrl}` : `Open TestLoop: ${input.dashboardUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `You're Added as a Tester — ${input.appName}`, html, text };
}

export function playIssueEmail(input: { title: string; body: string; href: string }) {
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(input.title)}</h1><p>${escapeHtml(input.body)}</p>${emailButton(input.href, "View in TestLoop")}`,
  );
  return {
    subject: input.title,
    html,
    text: `${input.title}\n\n${input.body}\n\nView in TestLoop: ${input.href}`,
  };
}

export function dailySummaryEmail(input: {
  dateLabel: string;
  lines: string[];
  attention: string[];
  dashboardUrl: string;
  period?: "daily" | "weekly";
}) {
  const weekly = input.period === "weekly";
  const heading = weekly ? "TestLoop weekly summary" : "TestLoop daily summary";
  const banner = weekly ? "TESTLOOP WEEKLY SUMMARY" : "TESTLOOP DAILY SUMMARY";
  const items = input.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const attention = input.attention.length
    ? `<p><strong>Attention required</strong></p><ul>${input.attention.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
    : `<p>Nothing needs your attention right now.</p>`;
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
    <p style="color:#64748b">${escapeHtml(input.dateLabel)}</p>
    <ul>${items}</ul>
    ${attention}
    ${emailButton(input.dashboardUrl, "View in TestLoop")}`,
  );
  const text = [
    banner,
    input.dateLabel,
    "",
    ...input.lines,
    "",
    "Attention required:",
    ...(input.attention.length ? input.attention : ["Nothing needs your attention right now."]),
    "",
    `View in TestLoop: ${input.dashboardUrl}`,
  ].join("\n");
  return { subject: `${heading} — ${input.dateLabel}`, html, text };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
