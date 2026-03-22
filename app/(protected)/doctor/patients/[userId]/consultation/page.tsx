"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Stethoscope } from "lucide-react";
import ConsultationSuite from "@/components/doctor/ConsultationSuite";

export default function ConsultationPage() {
    const { userId } = useParams<{ userId: string }>();
    const router = useRouter();

    if (!userId) return null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                        <ArrowLeft size={18} />
                    </Button>
                    <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                        <Stethoscope size={24} /> New Consultation
                    </span>
                </div>
            </div>

            <div className="bg-background">
                <ConsultationSuite patientId={userId} />
            </div>
        </div>
    );
}
