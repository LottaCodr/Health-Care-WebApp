"use client";

import { ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import AppointmentComponent from "@/components/front-desk/AppointmentComponent";
import { Button } from "@/components/ui/button";

export default function AppointmentsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const staffId = user?.$id ?? user?.id ?? "";

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                    <Calendar size={24} /> Appointments
                </span>
            </div>
            {staffId ? (
                <AppointmentComponent staffId={staffId} />
            ) : (
                <p className="text-sm text-gray-500">Sign in to view appointments.</p>
            )}
        </div>
    );
}
