import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Define protected routes
    const protectedPaths = [
        "/doctor",
        "/lab-tech",
        "/nurse",
        "/pharmacist",
        "/front-desk",
    ];

    const isProtected = protectedPaths.some((protectedPath) =>
        path.startsWith(protectedPath)
    );

    if (isProtected) {
        const token = await getToken({ req, secret: SECRET });

        if (!token) {
            return NextResponse.redirect(new URL("/staff", req.url));
        }

        const roleToPath: Record<string, string> = {
            doctor: "/doctor/dashboard",
            "lab-tech": "/lab-tech/dashboard",
            nurse: "/nurse/dashboard",
            pharmacist: "/pharmacist/dashboard",
            "front-desk": "/front-desk/dashboard",
        };

        const allowedPath = roleToPath[token.role as string];

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
        "/doctor/:path*",
        "/lab-tech/:path*",
        "/nurse/:path*",
        "/pharmacist/:path*",
        "/front-desk/:path*",
    ],
};
