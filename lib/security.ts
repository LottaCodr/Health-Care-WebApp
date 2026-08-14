/**
 * Shared security helpers usable on BOTH client and server.
 *
 * (No Node-only imports — this file is imported by `proxy.ts`, the login
 * page, and the auth provider.)
 */

/**
 * Sanitize a `?next=` / `?redirect=` value so it can only ever be a local,
 * same-origin path. Returns `null` for anything unsafe.
 *
 * Protects against open redirects, e.g. `/login?next=https://evil.example`
 * (an attacker crafts that link, a staff member logs in, and the browser is
 * silently forwarded to a phishing site).
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
    if (!raw) return null;

    let next = raw.trim();
    if (!next) return null;

    // Reject backslashes outright — browsers treat `\` as `/` in URLs, and
    // `\evil.com` / `https:\evil.com` tricks rely on that ambiguity.
    if (next.includes("\\")) return null;

    // Reject absolute URLs: "https://…", "http://…", "javascript:…",
    // "data:…", or any other scheme.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return null;

    // Reject protocol-relative URLs ("//evil.com").
    if (next.startsWith("//")) return null;

    // Reject control characters that could confuse URL parsers.
    if (/[\u0000-\u001f]/.test(next)) return null;

    // Must be an absolute local path from here on.
    if (!next.startsWith("/")) next = `/${next}`;

    return next;
}
