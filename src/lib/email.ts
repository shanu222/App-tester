import { env } from "@/lib/env";

/**
 * Optional transactional email. In-app notifications always remain the primary
 * channel. Missing RESEND_API_KEY is not an error.
 */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const to = input.to.trim();
  if (!to) return { ok: false, skipped: true };
  if (!env.resendApiKey) return { ok: false, skipped: true };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to,
        subject: input.subject,
        text: input.text,
      }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}
