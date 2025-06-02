import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_ROUTES } from "./constants";

export const config = {
    matcher: ["/", "/staff"],
};

// Extract user role from cookies
function getUserRole(req: NextRequest): string | null {
    return req.cookies.get("role")?.value ?? null;
}

/**
 * Middleware to handle user role-based redirection and authentication.
 *
 * This function inspects the incoming request to determine the user's role.
 * - If the user is unauthenticated (no role found), they are redirected to the `/staff` page.
 * - If the user has a recognized role, they are redirected to the route associated with their role,
 *   unless they are already on that route.
 * - If the user's role is invalid or they are already at the correct route, the request proceeds as normal.
 *
 * @param req - The incoming Next.js request object.
 * @returns A `NextResponse` object that either redirects the user or allows the request to continue.
 *
 * @remarks
 * This middleware assumes the existence of a `getUserRole` function to extract the user's role from the request,
 * and a `ROLE_ROUTES` mapping that associates roles with their respective routes.
 */
export function middleware(req: NextRequest) {
    const role = getUserRole(req);

    // If unauthenticated, always redirect to /staff
    if (!role) {
        return NextResponse.redirect(new URL("/staff", req.url));
    }

    // If role is recognized, redirect to its route
    const redirectPath = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
    if (redirectPath && req.nextUrl.pathname !== redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // If role is invalid or already at correct path, allow request to proceed
    return NextResponse.next();
}
