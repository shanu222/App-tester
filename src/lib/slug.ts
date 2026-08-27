/**
 * URL slugs for public TestLoop pages. Kept deliberately narrow — lowercase
 * ASCII, digits and single hyphens — so a slug is safe in a path segment
 * without escaping and stays readable when a developer shares it.
 */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/**
 * Build a slug that does not collide with one already taken.
 *
 * `isTaken` is injected so this stays a pure function that can be tested
 * without a database, and so the caller decides what "taken" means.
 */
export async function uniqueSlug(
  desired: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = "app",
) {
  const base = slugify(desired) || fallback;
  if (!(await isTaken(base))) return base;
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Deterministic attempts are exhausted; fall back to a random suffix rather
  // than failing the caller's operation.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
