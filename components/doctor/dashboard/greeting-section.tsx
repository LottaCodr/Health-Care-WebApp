"use client"

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GreetingSection() {

    const { user, loading, error } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "doctor")) {
            router.replace("/staff");
        }
    }, [loading, user]);

    if (loading) return (
        <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
    )
    if (error) return <p>Not authorized.</p>;
    return (
        <section>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, Dr. <span className="capitalize">{user?.name}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm">
                Overview of hospital activity and appointments.
            </p>
        </section>
    );
}