import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const PUBLIC_ROUTES = ["/", "/staff", "/staff/signup"];

const ROLE_DASHBOARD_MAP: Record<string, string> = {
    doctor: "/doctor",
    nurse: "/nurse",
    pharmacist: "/pharmacy",
    labtech: "/lab",
    frontdesk: "/frontdesk",
    admin: "/admin",
};

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = req.nextUrl.pathname;

    // ✅ Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
        // If logged in, redirect from login/signup to dashboard
        if (user && (pathname === "/staff" || pathname === "/staff/signup")) {
            const role = user.user_metadata?.role?.toLowerCase() || "staff";
            const redirectTo = ROLE_DASHBOARD_MAP[role]
                ? `${ROLE_DASHBOARD_MAP[role]}/dashboard`
                : "/dashboard";
            return NextResponse.redirect(new URL(redirectTo, req.url));
        }
        return res;
    }

    // ❌ If not logged in → send to login
    if (!user) {
        return NextResponse.redirect(new URL("/staff", req.url));
    }

    // ✅ Get user role (normalize to lowercase)
    const userRole = user.user_metadata?.role?.toLowerCase() || "staff";

    // ✅ Check role-based access
    const protectedPaths = Object.keys(ROLE_DASHBOARD_MAP);

    for (const role of protectedPaths) {
        const rolePrefix = `/${role === "pharmacist" ? "pharmacy" : role}`;

        if (pathname.startsWith(rolePrefix)) {
            // User trying to access a role-specific route
            if (userRole !== role) {
                // Redirect to their own dashboard
                const correctDashboard = ROLE_DASHBOARD_MAP[userRole]
                    ? `${ROLE_DASHBOARD_MAP[userRole]}/dashboard`
                    : "/dashboard";
                return NextResponse.redirect(new URL(correctDashboard, req.url));
            }
            // User has correct role, allow access
            return res;
        }
    }

    // Allow access to general routes (like /dashboard)
    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};