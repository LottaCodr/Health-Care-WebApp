"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";

export default function PrescriptionQueueRedirect() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user) return router.push("/unauthorized");
            router.replace("/pharmacist/dashboard-v2");
        }
    }, [user, loading, router]);

    return null;
}