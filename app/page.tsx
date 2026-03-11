"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirection logic by role
        const roleRoutes: Record<string, string> = {
          Doctor: "/doctor/dashboard",
          Nurse: "/nurse/dashboard",
          Pharmacist: "/pharmacist/dashboard",
          LabTechnician: "/lab-tech/dashboard",
          FrontDesk: "/front-desk/dashboard",
          Admin: "/admin/dashboard",
        };
        router.push(roleRoutes[user.role] || "/login");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
    </div>
  );
}
