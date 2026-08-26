import { google } from "googleapis";
import { env } from "@/lib/env";
import type { AdapterResult } from "@/lib/integrations/types";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function gmailOAuthClient() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    `${env.appUrl}/api/integrations/gmail/callback`,
  );
}

export function gmailAuthUrl(state: string) {
  const client = gmailOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeGmailCode(code: string) {
  const client = gmailOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

function encodeMessage(from: string, to: string, subject: string, body: string) {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmail(input: {
  refreshToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<AdapterResult<{ id: string }>> {
  try {
    const client = gmailOAuthClient();
    client.setCredentials({ refresh_token: input.refreshToken });
    const gmail = google.gmail({ version: "v1", auth: client });
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodeMessage(input.from, input.to, input.subject, input.body),
      },
    });
    if (!result.data.id) {
      return { ok: false, error: "Gmail API did not return a message ID.", code: "GMAIL_NO_ID" };
    }
    return { ok: true, data: { id: result.data.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gmail send failed.",
      code: "GMAIL_SEND_FAILED",
      manualFallback: "Copy the invitation text and send it from your own email client.",
    };
  }
}
