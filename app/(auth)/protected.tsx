"use client";

import { ReactNode, useEffect, useRef } from "react";
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
  if (!role) return "/staff";
  return ROLE_DASHBOARD_MAP[role] || "/staff";
}

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as (typeof PUBLIC_ROUTES)[number]);
}

export default function ProtectedRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthAndRedirect() {
      try {
        const user: Models.User<Models.Preferences> = await account.get();
        const role = user?.prefs?.role;

        // If on a public route, redirect authenticated user to their dashboard
        if (isPublicRoute(pathname)) {
          const dashboardRoute = getDashboardRoute(role);
          if (pathname !== dashboardRoute && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace(dashboardRoute);
          }
        }
      } catch {
        // If not authenticated and on a protected route, redirect to /staff
        if (!isPublicRoute(pathname) && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/staff");
        }
      }
    }

    checkAuthAndRedirect();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <>{children}</>;
}
