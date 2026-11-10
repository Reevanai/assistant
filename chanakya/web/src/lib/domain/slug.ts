/** Must match the CHECK constraint on public.organizations.slug. */
export const ORG_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export const isValidOrgSlug = (s: string) => ORG_SLUG_RE.test(s);
