import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ─── Public routes (no auth needed) ────────────────────────────────────────
const PUBLIC_PATHS = ["/", "/unauthorized", "/login"];

// ─── Role normalization (mirror logic from auth-provider) ──────────────────
function normalizeRole(role: any): string {
    if (typeof role !== "string") return role ?? "";
    const r = String(role).toLowerCase();
    if (r.includes("front")) return "FrontDesk";
    if (r.includes("doc")) return "Doctor";
    if (r.includes("nurse")) return "Nurse";
    if (r.includes("lab")) return "LabTechnician";
    if (r.includes("pharm")) return "Pharmacist";
    if (r.includes("admin")) return "Admin";
    return role;
}

// ─── Role → dashboard route map (values use normalized roles) ──────────────
const ROLE_DASHBOARD: Record<string, string> = {
    Doctor: "/doctor/dashboard",
    Nurse: "/nurse/dashboard",
    Pharmacist: "/pharmacist/dashboard",
    LabTechnician: "/lab-tech/dashboard",
    FrontDesk: "/front-desk/dashboard",
    Admin: "/admin/dashboard",
};

// ─── Role → route prefix map (used to guard wrong-role access) ─────────────
const ROLE_PREFIXES: Record<string, string> = {
    Doctor: "/doctor",
    Nurse: "/nurse",
    Pharmacist: "/pharmacist",
    LabTechnician: "/lab-tech",
    FrontDesk: "/front-desk",
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
        pathname.startsWith("/api") ||
        pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)
    ) {
        return NextResponse.next();
    }

    // ── Build Supabase SSR client (cookie-aware) ────────────────────────────
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
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

    // IMPORTANT: Do NOT remove getUser() — required for SSR session refresh
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // ── Allow public paths regardless of auth state ─────────────────────────
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        // If already logged in and hitting /login, redirect to dashboard
        if (user && pathname === "/login") {
            // Fetch role from staffs table

            const next = request.nextUrl.searchParams.get("next");

            if (next) {
                return NextResponse.redirect(new URL(next, request.url))
            }

            const { data: staffRow } = await supabase
                .from("staffs")
                .select("role")
                .eq("id", user.id)
                .single();

            const normalizedRole = normalizeRole(staffRow?.role);
            const dashboard = ROLE_DASHBOARD[normalizedRole] ?? "/login";

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
        const normalizedRole = normalizeRole(staffRow?.role);
        const dashboard = ROLE_DASHBOARD[normalizedRole] ?? "/login";
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

    const userRole = normalizeRole(staffRow?.role);

    // ── Role-based access control ────────────────────────────────────────────
    for (const [role, prefix] of Object.entries(ROLE_PREFIXES)) {
        if (pathname.startsWith(prefix)) {
            if (userRole !== role) {
                // User is on the wrong role's area → redirect to their dashboard
                const correctDash = ROLE_DASHBOARD[userRole] ?? "/login";
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
