/**
 * Slug generation and uniqueness utilities.
 */

/**
 * Converts any string to a URL-safe slug.
 * Idempotent: generateSlug(generateSlug(x)) === generateSlug(x) (CP-1)
 * Character invariant: output matches /^[a-z0-9][a-z0-9-]*[a-z0-9]$/ or /^[a-z0-9]$/ (CP-2)
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD') // decompose unicode
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '') // keep alphanumeric + spaces + hyphens
    .trim()
    .replace(/[\s-]+/g, '-') // collapse spaces/hyphens to single hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Ensures slug uniqueness by appending -2, -3, ... up to -999.
 * @param baseSlug - The base slug to check and modify if needed.
 * @param existsCheck - Async function returning true if the slug already exists.
 * @param excludeId - Optional record ID to exclude from conflict checks (for updates).
 * @throws Error if all suffixes -2 through -999 are taken.
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  existsCheck: (slug: string, excludeId?: string) => Promise<boolean>,
  excludeId?: string,
): Promise<string> {
  if (!(await existsCheck(baseSlug, excludeId))) return baseSlug;

  for (let i = 2; i <= 999; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await existsCheck(candidate, excludeId))) return candidate;
  }

  throw new Error(`Could not generate unique slug for base: ${baseSlug}`);
}
