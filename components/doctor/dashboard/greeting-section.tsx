"use client"

import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function GreetingSection() {

    const router = useRouter();

    const { data: user, isPending, isError } = useQuery({
        queryKey: ['user'],
        queryFn: () => getUser(),
    });


    if (user && user.role !== "doctor") {
        router.replace("/staff");
    }


    if (isPending) return (
        <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
    )
    if (isError) return <p>Not authorized.</p>;

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