/**
 * Role-based routing and access control utilities
 */

"use client";

import { UserRole } from "@/types/models";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { ReactNode } from "react";

// Route configuration by role
export const ROLE_ROUTES: Record<UserRole, string> = {
    [UserRole.FrontDesk]: "/front-desk/dashboard",
    [UserRole.Doctor]: "/doctor/dashboard",
    [UserRole.Nurse]: "/nurse/dashboard",
    [UserRole.LabTechnician]: "/lab-tech/dashboard",
    [UserRole.Pharmacist]: "/pharmacist/dashboard",
    [UserRole.Radiologist]: "/radiology/dashboard",
    [UserRole.Admin]: "/admin/dashboard",
};

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

    if (isLoading) return { authorized: false, loading: true };

    if (!user) {
        router.push("/login");
        return { authorized: false, loading: false };
    }

    const userRole = user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
        router.push("/unauthorized");
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
 * Get dashboard route for a specific role
 */
export function getDashboardRoute(role: UserRole): string {
    return ROLE_ROUTES[role] || "/login";
}

/**
 * Check if a route is accessible by a role
 */
export function isRouteAccessible(pathname: string, role: UserRole): boolean {
    for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(route)) {
            return roles.includes(role) || roles.includes(UserRole.Admin);
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

    const role = user.role as UserRole;
    return ROLE_ROUTES[role] || "/login";
}
