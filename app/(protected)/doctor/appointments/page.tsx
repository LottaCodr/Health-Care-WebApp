"use client";

import { ArrowLeft, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import AppointmentComponent from "@/components/front-desk/AppointmentComponent";

export default function AppointmentsPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const staffId = user?.$id ?? user?.id ?? "";

    return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
            <header className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    aria-label="Go back"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
                >
                    <ArrowLeft size={17} />
                </button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-gray-950">
                        <CalendarDays size={18} className="shrink-0 text-red-700" />
                        <h1 className="truncate text-lg font-black sm:text-xl">My appointments</h1>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">View your assigned schedule. Front Desk manages booking and check-in changes.</p>
                </div>
            </header>

            {isLoading ? (
                <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white" />
            ) : staffId ? (
                <AppointmentComponent staffId={staffId} canManage={false} scopeToStaff />
            ) : (
                <div role="alert" className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Sign in to view appointments.
                </div>
            )}
        </div>
    );
}
