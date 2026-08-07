/**
 * Role-based routing and access control utilities
 */

"use client";

import { UserRole } from "@/types/models";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { ReactNode, useEffect } from "react";
import {
    ROLE_DASHBOARD_MAP as SHARED_ROLE_DASHBOARD_MAP,
    getDashboardRoute,
} from "@/lib/role-dashboard";
import { normalizeUserRole } from "@/lib/roles";

// Route configuration by role
export const ROLE_ROUTES: Record<UserRole, string> = SHARED_ROLE_DASHBOARD_MAP;
export { getDashboardRoute };

// Protected routes that require specific roles
export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
    "/front-desk": [UserRole.FrontDesk, UserRole.Admin],
    "/doctor": [UserRole.Doctor, UserRole.Admin],
    "/nurse": [UserRole.Nurse, UserRole.Admin],
    "/lab-tech": [UserRole.LabTechnician, UserRole.Admin],
    "/pharmacist": [UserRole.Pharmacist, UserRole.Admin],
    "/radiology": [UserRole.Radiologist, UserRole.Admin],
    "/admin": [UserRole.Admin],
};

/**
 * Hook to enforce role-based access
 * Redirects to login if not authenticated or unauthorized
 */
export function useRoleProtection(allowedRoles: UserRole[]) {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const userRole = normalizeUserRole(user?.role) || undefined;
    const hasAccess = !!userRole && allowedRoles.includes(userRole);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        if (!hasAccess) {
            router.replace("/unauthorized");
        }
    }, [hasAccess, isLoading, user, router]);

    if (isLoading) return { authorized: false, loading: true };

    if (!user) {
        return { authorized: false, loading: false };
    }

    if (!hasAccess) {
        return { authorized: false, loading: false };
    }

    return { authorized: true, loading: false };
}

/**
 * Higher-order component for protecting routes
 */
export function withRoleProtection(
    Component: React.ComponentType<any>,
    allowedRoles: UserRole[]
) {
    return function ProtectedComponent(props: any) {
        const { authorized, loading } = useRoleProtection(allowedRoles);

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            );
        }

        if (!authorized) {
            return null;
        }

        return <Component {...props} />;
    };
}

/**
 * Check if a route is accessible by a role
 */
export function isRouteAccessible(pathname: string, role: UserRole): boolean {
    for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(route)) {
            return roles.includes(role);
        }
    }
    return false;
}

/**
 * Hook to get redirect URL after login based on role
 */
export function useRedirectAfterLogin() {
    const { user } = useAuth();

    if (!user) return "/login";

    return getDashboardRoute(user.role);
}
