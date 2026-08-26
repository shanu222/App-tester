export function googleLoginCallbackUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/auth/callback/google`;
}
