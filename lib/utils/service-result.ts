/**
 * Result envelope for server actions whose failure the user has to read.
 *
 * Next.js replaces the message of any error a Server Action THROWS with a
 * digest-only placeholder in production ("An error occurred in the Server
 * Components render. The specific message is omitted in production builds…"),
 * so a thrown, human-readable reason never reaches the screen. Actions return
 * this envelope instead, and the client-side caller re-throws (see
 * `unwrapResult`) — client-side the message survives, so React Query's
 * `error` state still works and shows the real reason.
 */
export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; message: string; code?: string | null };

/** Client-side: return the data, or throw an Error carrying the REAL message. */
export function unwrapResult<T>(result: ServiceResult<T>): T {
    if (result.ok) return result.data;
    const err = new Error(result.message) as Error & { code?: string | null };
    err.code = result.code ?? null;
    throw err;
}
