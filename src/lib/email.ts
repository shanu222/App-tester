import { sendSmtpEmail } from "@/lib/smtp";

/**
 * Transactional mail uses the server-side SMTP mailbox.
 * Kept as a thin wrapper so existing callers do not need SMTP details.
 */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  return sendSmtpEmail(input);
}
