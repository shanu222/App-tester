const EMAIL_RE =
  /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;

const GMAIL_HOSTS = new Set(["gmail.com", "googlemail.com"]);

export type ExtractedEmail = {
  raw: string;
  normalized: string;
  local: string;
  host: string;
  isGmail: boolean;
  valid: boolean;
  label: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailSyntax(email: string) {
  const normalized = normalizeEmail(email);
  if (normalized.length > 254) return false;
  const parts = normalized.split("@");
  if (parts.length !== 2) return false;
  const [local, host] = parts;
  if (!local || !host) return false;
  if (local.length > 64) return false;
  if (!/^[a-z0-9._%+\-]+$/i.test(local)) return false;
  if (!/^[a-z0-9.\-]+\.[a-z]{2,}$/i.test(host)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  return true;
}

export function describeEmail(email: string): ExtractedEmail {
  const raw = email.trim();
  const normalized = normalizeEmail(raw);
  const valid = isValidEmailSyntax(normalized);
  const [local = "", host = ""] = normalized.split("@");
  const isGmail = GMAIL_HOSTS.has(host);
  return {
    raw,
    normalized,
    local,
    host,
    isGmail,
    valid,
    label: isGmail
      ? "Potential Google Play account email"
      : "Email detected — not a Gmail address. Confirm only if this is the Google Play account.",
  };
}

export function extractEmails(text: string): ExtractedEmail[] {
  const matches = text.match(EMAIL_RE) ?? [];
  const seen = new Set<string>();
  const results: ExtractedEmail[] = [];
  for (const match of matches) {
    const described = describeEmail(match);
    if (!described.valid) continue;
    if (seen.has(described.normalized)) continue;
    seen.add(described.normalized);
    results.push(described);
  }
  return results;
}

export function preferredPlayEmail(emails: ExtractedEmail[]) {
  return emails.find((item) => item.isGmail) ?? emails[0] ?? null;
}
