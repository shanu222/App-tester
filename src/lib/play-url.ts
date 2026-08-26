const PACKAGE_RE = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
const PLAY_DETAILS_RE =
  /^https?:\/\/play\.google\.com\/store\/apps\/details\?(?:.*&)?id=([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+)/i;

export function isValidPackageName(packageName: string) {
  return PACKAGE_RE.test(packageName.trim());
}

export function canonicalPlayStoreUrl(packageName: string) {
  return `https://play.google.com/store/apps/details?id=${packageName.trim()}`;
}

export function parsePlayStoreUrl(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const match = value.match(PLAY_DETAILS_RE);
  if (!match?.[1]) return null;
  const packageName = match[1];
  return {
    packageName,
    canonical: canonicalPlayStoreUrl(packageName),
  };
}

export function validatePlayStoreUrl(packageName: string, url: string) {
  const parsed = parsePlayStoreUrl(url);
  if (!parsed) {
    return {
      ok: false as const,
      error:
        "Enter a legitimate Google Play URL in the form https://play.google.com/store/apps/details?id=PACKAGE_NAME",
    };
  }
  if (parsed.packageName !== packageName.trim()) {
    return { ok: false as const, error: "Package name does not match the Google Play URL." };
  }
  return { ok: true as const, url: parsed.canonical, packageName: parsed.packageName };
}
