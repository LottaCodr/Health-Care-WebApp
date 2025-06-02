import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_ROUTES } from "./constants";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;



    const isProtected = Object.values(ROLE_ROUTES).some((protectedPath) =>
        path.startsWith(protectedPath)
    );

    if (isProtected) {
        const token = await getToken({ req, secret: SECRET });

        if (!token) {
            return NextResponse.redirect(new URL("/staff", req.url));
        }


        const allowedPath = ROLE_ROUTES[token.role as keyof typeof ROLE_ROUTES];

        if (!allowedPath || !path.startsWith(allowedPath)) {
            // Logged in but trying to access a route not allowed for their role
            return NextResponse.redirect(new URL("/staff", req.url));
        }

        // Authorized
        return NextResponse.next();
    }

    // Allow all other routes
    return NextResponse.next();
}

// Apply only to the protected paths (improves performance)
export const config = {
    matcher: [
        "/doctor/dashboard",
        "/lab-tech/dashboard",
        "/nurse/dashboard",
        "/pharmacist/dashboard",
        "/front-desk/dashboard",
    ],
};
