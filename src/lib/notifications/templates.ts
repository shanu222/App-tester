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
  trackLabel: string;
  testerStatus: string;
  testerCount: number;
  targetTesters: number;
  actionRequired: string | null;
  campaignUrl: string;
  playConsoleUrl?: string | null;
}) {
  const action = input.actionRequired
    ? `<p><strong>Action required</strong><br>${escapeHtml(input.actionRequired)}</p>`
    : `<p>No Play Console tester-list action is required for this join.</p>`;
  const play =
    input.playConsoleUrl && input.actionRequired
      ? emailButton(input.playConsoleUrl, "Manage in Google Play")
      : "";
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">New tester joined — ${escapeHtml(input.appName)}</h1>
    <p>A tester joined your TestLoop testing request.</p>
    <p>
      <strong>App:</strong> ${escapeHtml(input.appName)}<br>
      <strong>Testing type:</strong> ${escapeHtml(input.testingTypeLabel)}<br>
      <strong>Track:</strong> ${escapeHtml(input.trackLabel)}<br>
      <strong>Tester status:</strong> ${escapeHtml(input.testerStatus)}<br>
      <strong>Testers:</strong> ${input.testerCount} of ${input.targetTesters}
    </p>
    ${action}
    ${emailButton(input.campaignUrl, "View Testing Request")}
    ${play}`,
  );
  const text = [
    `New tester joined — ${input.appName}`,
    "",
    `App: ${input.appName}`,
    `Testing type: ${input.testingTypeLabel}`,
    `Track: ${input.trackLabel}`,
    `Tester status: ${input.testerStatus}`,
    `Testers: ${input.testerCount} of ${input.targetTesters}`,
    input.actionRequired ? `Action required: ${input.actionRequired}` : "No Play Console tester-list action is required.",
    "",
    `View Testing Request: ${input.campaignUrl}`,
  ].join("\n");
  return { subject: `New tester joined — ${input.appName}`, html, text };
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
}) {
  const items = input.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const attention = input.attention.length
    ? `<p><strong>Attention required</strong></p><ul>${input.attention.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
    : `<p>Nothing needs your attention right now.</p>`;
  const html = wrapEmail(
    `<h1 style="font-size:20px;margin:0 0 12px">TestLoop daily summary</h1>
    <p style="color:#64748b">${escapeHtml(input.dateLabel)}</p>
    <ul>${items}</ul>
    ${attention}
    ${emailButton(input.dashboardUrl, "View in TestLoop")}`,
  );
  const text = [
    "TESTLOOP DAILY SUMMARY",
    input.dateLabel,
    "",
    ...input.lines,
    "",
    "Attention required:",
    ...(input.attention.length ? input.attention : ["Nothing needs your attention right now."]),
    "",
    `View in TestLoop: ${input.dashboardUrl}`,
  ].join("\n");
  return { subject: `TestLoop daily summary — ${input.dateLabel}`, html, text };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
