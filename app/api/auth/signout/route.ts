import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * POST /api/auth/signout
 * Clears the Supabase auth session server-side by expiring the cookies.
 * The browser client (`supabase.auth.signOut()`) deletes the `document.cookie`
 * pair, but httpOnly / partitioned cookies must be cleared via a Server
 * response.  Calling this endpoint after the browser signOut guarantees the
 * Next.js `proxy.ts` sees an unauthenticated request on the next navigation.
 *
 * A GET alias is exported so a plain `fetch('/api/auth/signout')` or a manual
 * navigation still works in tests / placeholder envs.
 */
async function handleSignOut(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // In preview / CI placeholder env the Supabase URL will be missing or the
    // dummy placeholder — nothing to clear server-side, just return success so
    // the client logout flow can continue without hanging.
    const isPlaceholder =
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes("placeholder");

    let supabaseResponse = NextResponse.json({ success: true });

    if (isPlaceholder) {
        // Still expire any sb-* cookies that may exist from a previous real run.
        const cookiesToExpire = request.cookies
            .getAll()
            .filter((c) => c.name.startsWith("sb-") || c.name.includes("supabase") || c.name.startsWith("sb:"));
        cookiesToExpire.forEach((cookie) => {
            supabaseResponse.cookies.set(cookie.name, "", {
                path: "/",
                maxAge: 0,
                expires: new Date(0),
            });
        });
        return supabaseResponse;
    }

    // Normal Supabase SSR client — `setAll` mirrors cookies onto the response
    // so `supabase.auth.signOut()` can expire them with Max-Age=0.
    supabaseResponse = NextResponse.json({ success: true });

    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    // Keep the mutate-next-request copy consistent
                    request.cookies.set(name, value);
                    supabaseResponse.cookies.set(name, value, options);
                });
            },
        },
    });

    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("[api/auth/signout] signOut error:", error);
        // Still return success — the client has already cleared its local state
        // and will hard-navigate to /login; failing to sign out server-side is
        // not a reason to keep the user trapped on a protected page.
    }

    // Defense-in-depth: also expire any sb-* cookies directly in case the
    // Supabase helper missed a partitioned / legacy cookie name.
    request.cookies
        .getAll()
        .filter((c) => c.name.startsWith("sb-"))
        .forEach((cookie) => {
            // Only expire if the Supabase helper didn't already schedule it.
            if (!supabaseResponse.cookies.get(cookie.name)) {
                supabaseResponse.cookies.set(cookie.name, "", {
                    path: "/",
                    maxAge: 0,
                    expires: new Date(0),
                });
            }
        });

    return supabaseResponse;
}

export async function POST(request: NextRequest) {
    return handleSignOut(request);
}

export async function GET(request: NextRequest) {
    return handleSignOut(request);
}
