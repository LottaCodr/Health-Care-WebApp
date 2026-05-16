"use client";

import { Loader2 } from "lucide-react";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { getDashboardRoute } from "@/lib/role-dashboard";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(getDashboardRoute(user.role));
    } else {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
    </div>
  );
}
