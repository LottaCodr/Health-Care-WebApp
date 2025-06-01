import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_ROUTES } from "./constants";

// Middleware runs on these paths
export const config = {
    matcher: ["/", "/staff"],
};

// Mock function to get user's role from cookies/session/jwt
function getUserRole(req: NextRequest): string | null {
    const role = req.cookies.get("role")?.value;
    return role ?? null;
}

export function middleware(req: NextRequest) {
    const role = getUserRole(req);

    if (!role) {
        // Not authenticated or missing role, redirect to /staff
        return NextResponse.redirect(new URL("/staff", req.url));
    }

    const redirectPath = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];

    if (redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // If no valid role found
    return NextResponse.redirect(new URL("/staff", req.url));
}
