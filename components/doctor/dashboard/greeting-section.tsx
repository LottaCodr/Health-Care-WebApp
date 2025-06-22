"use client";
import { useAuth } from "@/context/auth-provider";

export default function GreetingSection() {
    const { user } = useAuth();


    return (
        <section>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, Dr. <span className="capitalize">{user?.full_name}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm">
                Overview of hospital activity and appointments.
            </p>
        </section>
    );
}
