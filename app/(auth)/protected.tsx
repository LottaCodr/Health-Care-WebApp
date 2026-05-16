"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import supabase from "@/utils/supabase/client";
import { getDashboardRoute } from "@/lib/role-dashboard";

/**
 * Public routes that do not require authentication.
 * `/login` is the single source of truth for unauthenticated access.
 */
const PUBLIC_ROUTES = ["/login"] as const;

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

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Prefer role stored in user_metadata if available
          const role = (user.user_metadata as any)?.role as string | undefined;

          // If on a public route, redirect authenticated user to their dashboard
          if (isPublicRoute(pathname)) {
            const dashboardRoute = getDashboardRoute(role);
            if (pathname !== dashboardRoute) {
              router.replace(dashboardRoute);
            }
          }
        } else {
          // Not authenticated and on a protected route → redirect to /login
          if (!isPublicRoute(pathname) && pathname !== "/login") {
            router.replace("/login");
          }
        }
      } catch {
        // Swallow transient auth/network errors in dev. Navigation can retry on the next render.
      }
    }

    checkAuthAndRedirect();
  }, [pathname, router]);

  return <>{children}</>;
}
