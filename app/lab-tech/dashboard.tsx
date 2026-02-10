"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";

export default function LabDashboardRedirect() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user) return router.push("/unauthorized");
            // Redirect to the full-featured dashboard-v2
            router.replace("/lab-tech/dashboard-v2");
        }
    }, [user, loading, router]);

    return null;
}