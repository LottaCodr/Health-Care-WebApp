/**
 * Stand-in for `@/utils/supabase/server` used by the check harnesses.
 *
 * The production module builds an SSR client from the request cookies; here
 * there is no request, so a single in-memory client is used instead. It is the
 * SAME @supabase/supabase-js client the app uses, pointed at the mock project
 * via NEXT_PUBLIC_SUPABASE_URL, with a valid-looking JWT so `auth.getUser()`
 * really hits the mock's /auth/v1/user — which is what `requireStaff()` does.
 */
import { createClient as createJsClient } from "@supabase/supabase-js";

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

/** A syntactically valid, unexpired JWT (the mock never verifies a signature). */
export function mockJwt(sub) {
    const header = b64url({ alg: "HS256", typ: "JWT" });
    const payload = b64url({ sub, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" });
    return `${header}.${payload}.mock-signature`;
}

let clientPromise = null;

export function createClient() {
    if (!clientPromise) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "mock-anon-key";
        const client = createJsClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        clientPromise = client.auth
            .setSession({
                access_token: mockJwt(process.env.MOCK_STAFF_ID ?? "00000000-0000-4000-8000-000000000000"),
                refresh_token: "mock-refresh",
            })
            .then(() => client);
    }
    return clientPromise;
}
