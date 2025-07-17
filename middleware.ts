import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_ROUTES } from "./constants";

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\.).*)',
    ],
};

// Security headers configuration
const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
};

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
};

// Extract user role from cookies or headers
function getUserRole(req: NextRequest): string | null {
    // Check for session cookie first
    const sessionCookie = req.cookies.get("auth_session");
    if (sessionCookie?.value) {
        try {
            const sessionData = JSON.parse(sessionCookie.value);
            return sessionData.role || null;
        } catch {
            // Invalid session data
            return null;
        }
    }

    // Fallback to role cookie
    return req.cookies.get("role")?.value ?? null;
}

// Rate limiting function
function checkRateLimit(req: NextRequest): { allowed: boolean; remaining: number } {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.windowMs;

    const record = rateLimitStore.get(ip);

    if (!record || record.resetTime < now) {
        // New window or expired
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
    }

    if (record.count >= RATE_LIMIT.maxRequests) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count };
}

// Clean up expired rate limit records
function cleanupRateLimit() {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
        if (record.resetTime < now) {
            rateLimitStore.delete(ip);
        }
    }
}

// Run cleanup every 15 minutes
setInterval(cleanupRateLimit, 15 * 60 * 1000);

// CSRF protection
function validateCSRFToken(req: NextRequest): boolean {
    // Skip CSRF validation for GET requests
    if (req.method === 'GET') return true;

    const csrfToken = req.headers.get('x-csrf-token');
    const sessionToken = req.cookies.get('csrf_token')?.value;

    if (!csrfToken || !sessionToken) {
        return false;
    }

    return csrfToken === sessionToken;
}

// Check if route is public
function isPublicRoute(pathname: string): boolean {
    const publicRoutes = ['/staff', '/', '/api/auth', '/api/health'];
    return publicRoutes.some(route => pathname.startsWith(route));
}

// Check if route requires authentication
function requiresAuth(pathname: string): boolean {
    const protectedRoutes = ['/doctor', '/nurse', '/pharmacist', '/lab-tech', '/front-desk', '/admin'];
    return protectedRoutes.some(route => pathname.startsWith(route));
}

// Check role-based access
function hasRoleAccess(pathname: string, role: string | null): boolean {
    if (!role) return false;

    // Map routes to required roles
    const routeRoleMap: Record<string, string[]> = {
        '/doctor': ['doctor'],
        '/nurse': ['nurse'],
        '/pharmacist': ['pharmacist'],
        '/lab-tech': ['lab-tech'],
        '/front-desk': ['front-desk'],
        '/admin': ['admin', 'doctor'], // Admin routes accessible by admin and doctor
    };

    for (const [route, allowedRoles] of Object.entries(routeRoleMap)) {
        if (pathname.startsWith(route)) {
            return allowedRoles.includes(role);
        }
    }

    return false;
}

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const method = req.method;

    // Add security headers to all responses
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Rate limiting
    const rateLimit = checkRateLimit(req);
    if (!rateLimit.allowed) {
        return new NextResponse(
            JSON.stringify({ error: 'Too many requests' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '900', // 15 minutes
                    ...securityHeaders
                }
            }
        );
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

    // CSRF protection for non-GET requests
    if (method !== 'GET' && !isPublicRoute(pathname)) {
        if (!validateCSRFToken(req)) {
            return new NextResponse(
                JSON.stringify({ error: 'CSRF token validation failed' }),
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        ...securityHeaders
                    }
                }
            );
        }
    }

    // Authentication and authorization logic
    const role = getUserRole(req);

    // Public routes - allow access
    if (isPublicRoute(pathname)) {
        // If user is authenticated and on public route, redirect to their dashboard
        if (role && ROLE_ROUTES[role as keyof typeof ROLE_ROUTES]) {
            const dashboardPath = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
            if (pathname !== dashboardPath) {
                return NextResponse.redirect(new URL(dashboardPath, req.url));
            }
        }
        return response;
    }

    // Protected routes - require authentication
    if (requiresAuth(pathname)) {
        // Check if user is authenticated
        if (!role) {
            return NextResponse.redirect(new URL('/staff', req.url));
        }

        // Check role-based access
        if (!hasRoleAccess(pathname, role)) {
            // User doesn't have permission for this route
            const dashboardPath = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
            if (dashboardPath) {
                return NextResponse.redirect(new URL(dashboardPath, req.url));
            } else {
                return NextResponse.redirect(new URL('/staff', req.url));
            }
        }

        // User is authenticated and has proper role access
        return response;
    }

    // Default: allow access
    return response;
}
