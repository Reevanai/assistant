/** Exact public pages, and public path prefixes (which must end with "/"). */
const PUBLIC_EXACT = new Set(["/login", "/signup"]);
const PUBLIC_PREFIXES = ["/auth/", "/invite/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Accept only same-origin relative paths for post-login redirects.
 * Rejects absolute URLs, protocol-relative URLs ("//evil") and backslash tricks.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}

export const orgPath = (slug: string, sub = "command") => `/o/${slug}/${sub}`;
