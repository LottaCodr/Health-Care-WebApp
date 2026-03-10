"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashBoardComponent from "@/components/doctor";
import { useAuth } from "@/context/auth-provider";
import { Loader2 } from "lucide-react";

const DashboardPage: React.FC = () => {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    // Loading state
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-base text-muted-foreground text-center">
                        Loading your dashboard. Please wait...
                    </p>
                </div>
            </main>
        );
    }

    // Guard: user null after loading
    if (!user) return null;

    const formattedRole = user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Staff";

    return (
        <main className="min-h-screen w-full px-4 py-6 sm:px-6 md:py-10 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header Section */}
                <header className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                        Welcome back, {formattedRole} {user.name || ""}
                    </h1>
                    <p className="text-base text-gray-600">
                        Here&apos;s what&apos;s happening with your patients today.
                    </p>
                </header>

                {/* Dashboard Content */}
                <section className="w-full">
                    <DashBoardComponent />
                </section>
            </div>
        </main>
    );
};

export default DashboardPage;