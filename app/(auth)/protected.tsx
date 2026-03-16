"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import supabase from "@/utils/supabase/client";

/**
 * Public routes that do not require authentication.
 * `/login` is the single source of truth for unauthenticated access.
 */
const PUBLIC_ROUTES = ["/", "/login"] as const;

/**
 * Role → dashboard mapping (aligned with app-wide routing)
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  Doctor: "/doctor/dashboard",
  Nurse: "/nurse/dashboard",
  Pharmacist: "/pharmacist/dashboard",
  LabTechnician: "/lab-tech/dashboard",
  FrontDesk: "/front-desk/dashboard",
  Admin: "/admin/dashboard",
};

function getDashboardRoute(role?: string): string {
  if (!role) return "/login";
  return ROLE_DASHBOARD_MAP[role] || "/login";
}

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as (typeof PUBLIC_ROUTES)[number]);
}

export default function ProtectedRedirect({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    async function checkAuthAndRedirect() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Prefer role stored in user_metadata if available
        const role = (user.user_metadata as any)?.role as string | undefined;

        // If on a public route, redirect authenticated user to their dashboard
        if (isPublicRoute(pathname)) {
          const dashboardRoute = getDashboardRoute(role);
          if (pathname !== dashboardRoute && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace(dashboardRoute);
          }
        }
      } else {
        // Not authenticated and on a protected route → redirect to /login
        if (!isPublicRoute(pathname) && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/login");
        }
      }
    }

    checkAuthAndRedirect();
  }, [pathname, router]);

  return <>{children}</>;
}
