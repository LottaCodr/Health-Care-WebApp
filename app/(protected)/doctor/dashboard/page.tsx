"use client";

import React from "react";
import DashBoardComponent from "@/components/doctor";
import { useAuth } from "@/context/auth-provider";
import { Loader2 } from "lucide-react";

/**
 * Dashboard Page Component
 * 
 * Main dashboard view for authenticated staff members.
 * Displays personalized welcome message and patient overview.
 */
const DashboardPage: React.FC = () => {
    const { user, isLoading, isAuthenticated } = useAuth();

    // Loading state
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
            </main>
        );
    }

    // Authentication check
    if (!isAuthenticated || !user) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground">
                        Authentication required to view this page.
                    </p>
                </div>
            </main>
        );
    }

    // Format role for display (capitalize first letter)
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
                        Here's what's happening with your patients today.
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