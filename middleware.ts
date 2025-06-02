import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_ROUTES } from "./constants";

export const config = {
    matcher: ["/", "/staff"], // Apply middleware only to homepage and /staff
};

// Extract user role from cookies
function getUserRole(req: NextRequest): string | null {
    return req.cookies.get("role")?.value ?? null;
}

export function middleware(req: NextRequest) {
    const role = getUserRole(req);
    const currentPath = req.nextUrl.pathname;

    // 1. Redirect unauthenticated users to /staff
    if (!role && currentPath !== "/staff") {
        return NextResponse.redirect(new URL("/staff", req.url));
    }

    // 2. If role exists, redirect them to their dashboard
    const dashboardPath = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
    if (role && dashboardPath && currentPath !== dashboardPath) {
        return NextResponse.redirect(new URL(dashboardPath, req.url));
    }

    // 3. Allow access if already at the correct path
    return NextResponse.next();
}
