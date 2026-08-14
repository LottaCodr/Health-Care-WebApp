import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDashboardRoute } from "@/lib/role-dashboard";
import { normalizeUserRole } from "@/lib/roles";
import { sanitizeNextPath } from "@/lib/security";

// ─── Public routes (no auth needed) ────────────────────────────────────────
const PUBLIC_PATHS = ["/unauthorized", "/login", "/portal"];

// ─── Role → route prefix map (used to guard wrong-role access) ─────────────
const ROLE_PREFIXES: Record<string, string> = {
    Doctor: "/doctor",
    Nurse: "/nurse",
    Pharmacist: "/pharmacist",
    LabTechnician: "/lab-tech",
    FrontDesk: "/front-desk",
    Radiologist: "/radiology",
    Admin: "/admin",
};

/**
 * Proxy function (formerly middleware in Next.js < 16)
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── Skip Next.js internals & static assets ──────────────────────────────
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)
    ) {
        return NextResponse.next();
    }

    // ── Build Supabase SSR client (cookie-aware) ────────────────────────────
    let supabaseResponse = NextResponse.next({ request });

    // Baseline security headers on every response.
    supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
    supabaseResponse.headers.set("X-Frame-Options", "DENY");
    supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    supabaseResponse.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );

    // In preview / CI placeholder environments the Supabase credentials are
    // missing — degrade to "not authenticated" instead of crashing every
    // request (mirrors utils/supabase/server.ts).
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do NOT remove getUser() — required for SSR session refresh.
    // In placeholder environments the auth backend is unreachable; treat the
    // request as unauthenticated (the app's other layers degrade the same way).
    let user = null;
    try {
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();
        user = authUser;
    } catch {
        user = null;
    }

    // ── API routes ────────────────────────────────────────────────────────────
    // Only the auth helper endpoints are public; every other /api/* route
    // (present or future) must be reached with a valid session.
    if (pathname.startsWith("/api")) {
        if (pathname.startsWith("/api/auth/")) {
            return supabaseResponse;
        }
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return supabaseResponse;
    }

    // ── Allow public paths regardless of auth state ─────────────────────────
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        // If already logged in and hitting /login, redirect to dashboard
        if (user && pathname === "/login") {
            // Open-redirect guard: only honor `next` when it is a safe,
            // same-origin path (see lib/security.ts#sanitizeNextPath).
            const safeNext = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

            if (safeNext) {
                return NextResponse.redirect(new URL(safeNext, request.url));
            }

            const { data: staffRow } = await supabase
                .from("staffs")
                .select("role")
                .eq("id", user.id)
                .single();

            const normalizedRole = normalizeUserRole(staffRow?.role);
            const dashboard = getDashboardRoute(normalizedRole);

            return NextResponse.redirect(new URL(dashboard, request.url));
        }
        return supabaseResponse;
    }

    // ── Root "/" → redirect appropriately ───────────────────────────────────
    if (pathname === "/") {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        const { data: staffRow } = await supabase
            .from("staffs")
            .select("role")
            .eq("id", user.id)
            .single();
        const normalizedRole = normalizeUserRole(staffRow?.role);
        const dashboard = getDashboardRoute(normalizedRole);
        return NextResponse.redirect(new URL(dashboard, request.url));
    }

    // ── Not logged in → send to login ───────────────────────────────────────
    if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ── Fetch role for RBAC enforcement ─────────────────────────────────────
    const { data: staffRow } = await supabase
        .from("staffs")
        .select("role")
        .eq("id", user.id)
        .single();

    const userRole = normalizeUserRole(staffRow?.role);

    // ── Role-based access control ────────────────────────────────────────────
    for (const [role, prefix] of Object.entries(ROLE_PREFIXES)) {
        if (pathname.startsWith(prefix)) {
            // Admin dashboard links intentionally provide cross-department
            // oversight; every other role stays restricted to its own prefix.
            if (userRole !== role && userRole !== "Admin") {
                // User is on the wrong role's area → redirect to their dashboard
                const correctDash = getDashboardRoute(userRole);
                return NextResponse.redirect(new URL(correctDash, request.url));
            }
            break;
        }
    }

    return supabaseResponse;
}

export const config = {
    // Match all paths except static files and Next.js internals
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|woff2?)).*)",
    ],
};
