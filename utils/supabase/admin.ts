import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service-role key (bypasses RLS and
 * grants access to the Auth admin API — e.g. `auth.admin.deleteUser`).
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is not configured, so
 * callers can degrade gracefully instead of crashing.
 *
 * ⚠️ Never import this from a client component — the service-role key must
 * stay on the server.
 */
let cachedAdmin: SupabaseClient | null | undefined;

export function createAdminClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) return null;
    if (cachedAdmin !== undefined) return cachedAdmin;

    cachedAdmin = createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return cachedAdmin;
}
