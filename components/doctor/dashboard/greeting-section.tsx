"use client";

import { useAuth } from "@/app/context/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GreetingSection() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && user?.role !== "doctor") {
            router.replace("/staff");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-md" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <p>Not authorized.</p>;
    }

    return (
        <section>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, Dr. <span className="capitalize">{user.name}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm">
                Overview of hospital activity and appointments.
            </p>
        </section>
    );
}
