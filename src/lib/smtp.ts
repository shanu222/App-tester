import { env, smtpConfigured } from "@/lib/env";

export type SmtpSendResult = { ok: true } | { ok: false; error: string; skipped?: boolean };

function fromHeader() {
  const name = env.smtpFromName.replace(/[\r\n<>]/g, "").trim() || "TestLoop";
  const email = env.smtpFromEmail.trim();
  return `${name} <${email}>`;
}

/**
 * Send mail through the server-side SMTP mailbox.
 * Never logs credentials. Error messages must stay safe for clients.
 */
export async function sendSmtpEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SmtpSendResult> {
  const to = input.to.trim();
  if (!to) return { ok: false, error: "No recipient address was provided.", skipped: true };
  if (!smtpConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: "Email sending is not configured on this server.",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword,
      },
    });
    await transporter.sendMail({
      from: fromHeader(),
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to send email right now. Try again later." };
  }
}
