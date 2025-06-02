"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function GreetingSection() {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === "loading") {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-md" />
            </div>
        );
    }

    if (!session || session.user.role !== "doctor") {
        router.replace("/staff");
        return null; // Prevent flash of unauthorized content
    }

    return (
        <section>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, Dr. <span className="capitalize">{session.user.name}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm">
                Overview of hospital activity and appointments.
            </p>
        </section>
    );
}
