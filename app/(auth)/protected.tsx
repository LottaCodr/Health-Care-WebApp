"use client";

import { ReactNode, useEffect } from "react";
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

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as (typeof PUBLIC_ROUTES)[number]);
}

export default function ProtectedRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndRedirect() {
      try {
        const user: Models.User<Models.Preferences> = await account.get();
        const role = user?.prefs?.role;

        // If on a public route, redirect authenticated user to their dashboard
        if (isPublicRoute(pathname)) {
          const dashboardRoute = getDashboardRoute(role);
          if (pathname !== dashboardRoute) {
            router.replace(dashboardRoute);
          }
        }
      } catch {
        // If not authenticated and on a protected route, redirect to /staff
        if (!isPublicRoute(pathname)) {
          router.replace("/staff");
        }
      }
    }

    // Only run on mount and when pathname changes
    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  return <>{children}</>;
}
