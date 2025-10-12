"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import supabase from "@/utils/supabase/client";


const PUBLIC_ROUTES = ["/", "/staff"] as const;

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  doctor: "/doctor/dashboard",
  nurse: "/nurse/dashboard",
  pharmacist: "/pharmacist/dashboard",
  labtech: "/labtech/dashboard",
  frontdesk: "/frontdesk/dashboard",
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
    async function checkAuthAndRedirect() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user) {
        const role = (user.user_metadata as any)?.role; // Supabase custom claim

        // If on a public route, redirect authenticated user to their dashboard
        if (isPublicRoute(pathname)) {
          const dashboardRoute = getDashboardRoute(role);
          if (pathname !== dashboardRoute && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace(dashboardRoute);
          }
        }
      } else {
        // Not authenticated and on a protected route → redirect to /staff (login)
        if (!isPublicRoute(pathname) && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/staff");
        }
      }
    }

    checkAuthAndRedirect();
  }, [pathname, router]);

  return <>{children}</>;
}
