// src/utils/safeRedirect.ts

/**
 * Validates a user-supplied redirect target so it can only ever point inside
 * this app. Rejects anything that isn't a same-origin path:
 *   - absolute URLs ("https://evil.com")
 *   - protocol-relative URLs ("//evil.com", which new URL() and browsers
 *     resolve to another origin)
 *   - backslash variants ("/\evil.com", which browsers normalize to "//")
 */
export function safeInternalPath(
  path: string | null | undefined,
  fallback = '/',
): string {
  if (
    !path ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.startsWith('/\\')
  ) {
    return fallback
  }
  return path
}
