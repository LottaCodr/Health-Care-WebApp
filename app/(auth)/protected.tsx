"use client";

import { ReactNode, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { account } from "@/lib/appwrite.config";
import { Models } from "appwrite";

const PUBLIC_ROUTES = ["/", "/staff"] as const;

const ROLE_DASHBOARD_MAP: Record<string, string> = {
    doctor: "/doctor/dashboard",
    nurse: "/nurse/dashboard",
    pharmacist: "/pharmacist/dashboard",
    "lab-tech": "/lab-tech/dashboard",
    "front-desk": "/front-desk/dashboard",
};

function getDashboardRoute(role?: string): string {
    return ROLE_DASHBOARD_MAP[role as keyof typeof ROLE_DASHBOARD_MAP] || "/staff";
}

export default function ProtectedRedirect({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleRedirect = useCallback(
        async () => {
            try {
                const user: Models.User<Models.Preferences> = await account.get();
                const role = user?.prefs?.role;

                // If user is on a public route, redirect to their dashboard
                if (PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number])) {
                    const dashboardRoute = getDashboardRoute(role);
                    if (pathname !== dashboardRoute) {
                        router.replace(dashboardRoute);
                    }
                }
            } catch (error) {
                // If not authenticated and on a protected route, redirect to /staff
                if (!PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number])) {
                    router.replace("/staff");
                }
            }
        },
        [pathname, router]
    );

    useEffect(() => {
        handleRedirect();
        // Only run when pathname or router changes
    }, [handleRedirect]);

    return <>{children}</>;
}
