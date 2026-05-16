"use client";

import dynamic from "next/dynamic";

const RegistrationSuite = dynamic(
    () => import("@/components/front-desk/components/register-patient/RegistrationSuite"),
    {
        ssr: false,
        loading: () => (
            <div className="animate-pulse space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
                <div className="h-8 w-48 bg-gray-100 rounded-xl" />
                <div className="h-40 bg-gray-50 rounded-2xl" />
                <div className="h-32 bg-gray-50 rounded-2xl" />
            </div>
        ),
    }
);
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewPatientPage() {
    const router = useRouter();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                    <UserPlus size={24} /> New Admission
                </span>
            </div>

            <RegistrationSuite />
        </div>
    );
}