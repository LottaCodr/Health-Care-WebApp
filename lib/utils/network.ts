/**
 * Network resilience helpers — used across forms, auth, and mutations so the
 * app degrades gracefully on poor/flaky connections instead of hanging or
 * showing raw "fetch failed" errors.
 */

/** Messages that indicate a transient network-level failure. */
const NETWORK_ERROR_PATTERNS = [
    "fetch failed",
    "networkerror",
    "network error",
    "failed to fetch",
    "load failed",
    "socket hang up",
    "econnreset",
    "econnrefused",
    "eai_again",
    "etimedout",
    "timeout exceeded",
    "aborted",
    "websocket",
    "connection",
    "offline",
    "unexpected end of json input",
    "failed to connect",
    "server connection",
] as const;

/** True when the error looks like a transient network failure (retryable). */
export function isNetworkError(err: unknown): boolean {
    if (!err) return false;

    const message =
        (err as any)?.message ??
        (err as any)?.error_description ??
        (typeof err === "string" ? err : String(err));

    if (typeof message !== "string") return false;

    const lower = message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** True when the user's browser is currently offline (or believed offline). */
export function isBrowserOnline(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
}

/**
 * Reject a promise if it doesn't settle within `ms`. Used to stop UI actions
 * (login, save, submit) from spinning forever on a dead connection.
 */
export function withTimeout<T>(
    promise: Promise<T>,
    ms = 15_000,
    message = "Request timed out. Please check your connection and try again."
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error(message);
            err.name = "TimeoutError";
            reject(err);
        }, ms);
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}

/**
 * Retry an idempotent async operation with exponential backoff + jitter.
 *
 * ⚠️ Only use for operations safe to run more than once (reads, idempotent
 * writes). Do NOT use for `createPatient`/`createStaff`-style mutations where
 * a retry could double-create records.
 */
export async function runWithRetry<T>(
    fn: () => Promise<T>,
    {
        retries = 3,
        baseDelayMs = 1_000,
        maxDelayMs = 10_000,
        shouldRetry = isNetworkError,
    }: {
        retries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        shouldRetry?: (err: unknown) => boolean;
    } = {}
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const canRetry = shouldRetry(err) && attempt < retries;

            // Timeouts and "server busy" errors are retryable; actual
            // application errors (validation, auth rejections, duplicates)
            // should surface immediately.
            if (!canRetry) break;

            const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
            const jitter = Math.random() * backoff * 0.25; // avoid thundering herd
            await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
        }
    }

    throw lastError;
}

/** Map an error to a human-friendly message. */
export function friendlyErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
    if (!err) return fallback;

    if (typeof err === "string") return err;

    const message = (err as any)?.message ?? (err as any)?.error_description;

    if (!message || typeof message !== "string") return fallback;

    if (isNetworkError(err)) {
        return isBrowserOnline()
            ? "Network trouble detected. Please check your connection and try again."
            : "You appear to be offline. Reconnect and try again.";
    }

    if (message.toLowerCase().includes("timeout")) {
        return "The request took too long. Please check your connection and try again.";
    }

    return message;
}

/** Sleep helper (kept here so callers don't hand-roll setTimeout). */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
